'use client';

import { memo } from 'react';
import Link from 'next/link';
import styles from './Podium.module.css';

interface Investor {
  rank: number;
  name: string;
  avgReturnRate: number;
  linkPath?: string;
}

interface PodiumProps {
  topThree: Investor[];
}

const Podium = memo(function Podium({ topThree }: PodiumProps) {
  const [first, second, third] = topThree;

  return (
    <div className={styles.container}>
      <div className={styles.darkBox}>
        <div className={styles.topLine}></div>

        <div className={styles.content}>
          {/* 헤더 */}
          <div className={styles.header}>
            <div className={styles.headerInner}>
              <p className={styles.subtitle}>Hall of Fame</p>
              <h2 className={styles.title}>TOP 3</h2>
              <div className={styles.headerLine}></div>
            </div>
          </div>

          <div className={styles.podiumLayout}>
            {/* 2위 */}
            {second && (
              <div className={styles.rankColumn}>
                <Link
                  href={second.linkPath || `/user/${encodeURIComponent(second.name)}`}
                  className={styles.rankLink}
                >
                  <div className={styles.profileArea}>
                    <div className={`${styles.badge} ${styles.badgeSecond}`}>
                      <div className={styles.badgeSecondInner}></div>
                      <div className={styles.badgeSecondShine}></div>
                      <span className={styles.badgeSecondNumber}>2</span>
                    </div>
                    <div className={styles.name}>{second.name}</div>
                    <div className={`${styles.returnBadge} ${second.avgReturnRate >= 0 ? styles.returnPositive : styles.returnNegative}`}>
                      {second.avgReturnRate >= 0 ? '+' : ''}{second.avgReturnRate.toFixed(2)}%
                    </div>
                  </div>
                  <div className={`${styles.bottomLine} ${styles.bottomLineGold}`}></div>
                </Link>
              </div>
            )}

            {/* 1위 - 다이아몬드 */}
            {first && (
              <div className={styles.rankColumn}>
                <Link
                  href={first.linkPath || `/user/${encodeURIComponent(first.name)}`}
                  className={styles.rankLink}
                >
                  <div className={`${styles.profileArea} ${styles.profileAreaFirst}`}>
                    <div className={`${styles.badge} ${styles.badgeFirst}`}>
                      <div className={styles.badgeFirstGlow}></div>
                      <div className={styles.badgeFirstInner}></div>
                      <div className={styles.badgeFirstShine}></div>
                      <div className={styles.badgeFirstSparkle}></div>
                      <span className={styles.badgeFirstNumber}>1</span>
                    </div>
                    <div className={`${styles.name} ${styles.nameFirst}`}>{first.name}</div>
                    <div className={`${styles.returnBadge} ${styles.returnBadgeFirst} ${first.avgReturnRate >= 0 ? styles.returnPositive : styles.returnNegative}`}>
                      {first.avgReturnRate >= 0 ? '+' : ''}{first.avgReturnRate.toFixed(2)}%
                    </div>
                  </div>
                  <div className={`${styles.bottomLine} ${styles.bottomLineDiamond}`}></div>
                </Link>
              </div>
            )}

            {/* 3위 - 실버 */}
            {third && (
              <div className={styles.rankColumn}>
                <Link
                  href={third.linkPath || `/user/${encodeURIComponent(third.name)}`}
                  className={styles.rankLink}
                >
                  <div className={styles.profileArea}>
                    <div className={`${styles.badge} ${styles.badgeThird}`}>
                      <div className={styles.badgeThirdInner}></div>
                      <div className={styles.badgeThirdShine}></div>
                      <span className={styles.badgeThirdNumber}>3</span>
                    </div>
                    <div className={styles.name}>{third.name}</div>
                    <div className={`${styles.returnBadge} ${third.avgReturnRate >= 0 ? styles.returnPositive : styles.returnNegative}`}>
                      {third.avgReturnRate >= 0 ? '+' : ''}{third.avgReturnRate.toFixed(2)}%
                    </div>
                  </div>
                  <div className={`${styles.bottomLine} ${styles.bottomLineSilver}`}></div>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className={styles.bottomLine}></div>
      </div>
    </div>
  );
});

export default Podium;
