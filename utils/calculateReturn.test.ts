import { calculateReturn, formatReturn, getReturnColorClass } from './calculateReturn';

/**
 * 수익률 계산 테스트 예시
 */

// 예시 1: 롱 포지션 - 가격 상승
console.log('=== 롱 포지션 테스트 ===');
const longInitialPrice = 100000; // 작성 당시 가격: 100,000원
const longCurrentPriceUp = 120000; // 현재 가격: 120,000원 (20% 상승)
const longReturnUp = calculateReturn(longInitialPrice, longCurrentPriceUp, 'long');
console.log(`초기 가격: ${longInitialPrice}원, 현재 가격: ${longCurrentPriceUp}원`);
console.log(`수익률: ${formatReturn(longReturnUp)}`); // +20.00%
console.log(`색상: ${getReturnColorClass(longReturnUp)}`); // 초록색 (수익)

// 예시 2: 롱 포지션 - 가격 하락
const longCurrentPriceDown = 80000; // 현재 가격: 80,000원 (20% 하락)
const longReturnDown = calculateReturn(longInitialPrice, longCurrentPriceDown, 'long');
console.log(`초기 가격: ${longInitialPrice}원, 현재 가격: ${longCurrentPriceDown}원`);
console.log(`수익률: ${formatReturn(longReturnDown)}`); // -20.00%
console.log(`색상: ${getReturnColorClass(longReturnDown)}`); // 빨간색 (손실)

console.log('\n=== 숏 포지션 테스트 ===');
// 예시 3: 숏 포지션 - 가격 하락
const shortInitialPrice = 100000; // 작성 당시 가격: 100,000원
const shortCurrentPriceDown = 80000; // 현재 가격: 80,000원 (20% 하락)
const shortReturnDown = calculateReturn(shortInitialPrice, shortCurrentPriceDown, 'short');
console.log(`초기 가격: ${shortInitialPrice}원, 현재 가격: ${shortCurrentPriceDown}원`);
console.log(`수익률: ${formatReturn(shortReturnDown)}`); // +20.00% (가격 하락 = 수익)
console.log(`색상: ${getReturnColorClass(shortReturnDown)}`); // 초록색 (수익)

// 예시 4: 숏 포지션 - 가격 상승
const shortCurrentPriceUp = 120000; // 현재 가격: 120,000원 (20% 상승)
const shortReturnUp = calculateReturn(shortInitialPrice, shortCurrentPriceUp, 'short');
console.log(`초기 가격: ${shortInitialPrice}원, 현재 가격: ${shortCurrentPriceUp}원`);
console.log(`수익률: ${formatReturn(shortReturnUp)}`); // -20.00% (가격 상승 = 손실)
console.log(`색상: ${getReturnColorClass(shortReturnUp)}`); // 빨간색 (손실)

console.log('\n=== 요약 ===');
console.log('롱 포지션: 가격 상승 → 수익(+), 가격 하락 → 손실(-)');
console.log('숏 포지션: 가격 하락 → 수익(+), 가격 상승 → 손실(-)');
