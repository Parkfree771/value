// 네이티브 앱(Capacitor WebView) 브릿지.
// 앱은 배포된 웹(antstreet.kr)을 그대로 로드하므로, 이 코드는 웹 번들에 포함되지만
// window.Capacitor가 주입된 앱 안에서만 네이티브 경로를 탄다. 일반 브라우저 동작은 불변.
//
// 구글 로그인: 웹뷰 안에서는 구글 OAuth 페이지가 차단됨(disallowed_useragent).
// → 네이티브 SDK(@capgo/capacitor-social-login)로 로그인해 idToken을 받고
//   supabase.auth.signInWithIdToken으로 세션을 만든다.
//
// 애플 로그인: iOS 앱에서는 시스템 네이티브 Sign in with Apple(App Store 심사 4.8 필수)로
// idToken을 받아 같은 방식으로 세션을 만든다. 웹/Android는 Supabase OAuth 웹 플로우 사용
// (애플은 구글과 달리 웹뷰 OAuth를 차단하지 않음).

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  // 앱이 원격 URL(antstreet.kr)을 로드할 때 주입되는 브릿지에는 registerPlugin이 없고,
  // 네이티브에 등록된 플러그인들이 Plugins.<이름> 프록시로 노출된다.
  Plugins?: Record<string, unknown>;
  registerPlugin?: (name: string) => unknown;
}

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null;
  return (window as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

/** Capacitor 네이티브 앱(iOS/Android) 안에서 실행 중인지 */
export function isNativeApp(): boolean {
  const cap = getCapacitor();
  return cap?.isNativePlatform?.() === true;
}

/** 'ios' | 'android' | 'web' */
export function getNativePlatform(): string {
  const cap = getCapacitor();
  return cap?.getPlatform?.() ?? 'web';
}

interface SocialLoginPlugin {
  initialize(options: {
    google?: {
      webClientId?: string;
      iOSClientId?: string;
      iOSServerClientId?: string;
      mode?: 'online' | 'offline';
    };
    apple?: {
      clientId?: string;
    };
  }): Promise<void>;
  login(options: {
    provider: 'google' | 'apple';
    options: { scopes?: string[] };
  }): Promise<{
    provider: string;
    result?: { idToken?: string | null; accessToken?: { token: string } | null };
  }>;
  logout(options: { provider: 'google' | 'apple' }): Promise<void>;
}

let initialized = false;

async function getSocialLogin(): Promise<SocialLoginPlugin> {
  const cap = getCapacitor();
  // 원격 로드 앱: Plugins 프록시 사용. (registerPlugin은 로컬 번들 앱에서만 존재하는 폴백)
  const plugin = (cap?.Plugins?.SocialLogin ??
    (cap?.registerPlugin ? cap.registerPlugin('SocialLogin') : null)) as SocialLoginPlugin | null;
  if (!plugin) {
    throw new Error('네이티브 앱 환경이 아닙니다 (Capacitor SocialLogin 플러그인 없음)');
  }

  if (!initialized) {
    const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    await plugin.initialize({
      // 구글: 웹 클라이언트 ID가 설정된 경우에만 초기화 (없으면 애플 로그인만 사용 가능)
      ...(webClientId
        ? {
            google: {
              webClientId,
              // iOS는 iOS 전용 클라이언트 ID로 로그인하고,
              // idToken의 audience는 webClientId(iOSServerClientId)로 맞춰 Supabase가 검증 가능하게 한다.
              iOSClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
              iOSServerClientId: webClientId,
              mode: 'online' as const,
            },
          }
        : {}),
      // iOS Sign in with Apple: 시스템 API 사용. clientId는 OS 레벨에서는 쓰이지 않고
      // 플러그인 초기화 식별용. idToken의 audience는 앱 번들 ID(kr.antstreet.app)가 되므로
      // Supabase > Auth > Providers > Apple의 Authorized Client IDs에 번들 ID를 등록해야 한다.
      // ⚠️ iOS에서만 전달 — Android 플러그인은 apple 설정에 redirectUrl을 요구하며 없으면
      //    initialize 전체가 거부됨 (Android 애플 로그인은 플러그인이 아니라 Supabase 웹 OAuth 사용).
      ...(getNativePlatform() === 'ios'
        ? { apple: { clientId: 'kr.antstreet.app' } }
        : {}),
    });
    initialized = true;
  }
  return plugin;
}

/** 네이티브 구글 로그인 → Google idToken 반환 */
export async function nativeGoogleSignIn(): Promise<string> {
  if (!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID가 설정되지 않았습니다. ' +
        'Supabase 대시보드 > Auth > Providers > Google의 Client ID를 환경변수로 넣어주세요.',
    );
  }
  const plugin = await getSocialLogin();
  const res = await plugin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] },
  });
  const idToken = res.result?.idToken;
  if (!idToken) {
    throw new Error('구글 로그인에서 idToken을 받지 못했습니다');
  }
  return idToken;
}

/** 네이티브 애플 로그인 → Apple idToken 반환 (iOS 전용) */
export async function nativeAppleSignIn(): Promise<string> {
  const plugin = await getSocialLogin();
  const res = await plugin.login({
    provider: 'apple',
    options: { scopes: ['email', 'name'] },
  });
  const idToken = res.result?.idToken;
  if (!idToken) {
    throw new Error('애플 로그인에서 idToken을 받지 못했습니다');
  }
  return idToken;
}

/** 네이티브 소셜 세션도 함께 정리 (Supabase signOut과 별개) */
export async function nativeSocialSignOut(): Promise<void> {
  for (const provider of ['google', 'apple'] as const) {
    try {
      const plugin = await getSocialLogin();
      await plugin.logout({ provider });
    } catch {
      // 네이티브 로그아웃 실패는 치명적이지 않음 — Supabase 세션만 끊겨도 로그아웃 상태
    }
  }
}