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

  const renderCard = (data: Investor | undefined, rank: number) => {
    if (!data) return null;

    const cardClass = `${styles.card} ${
      rank === 1 ? styles.cardFirst : rank === 2 ? styles.cardSecond : styles.cardThird
    }`;
    const rankClass = `${styles.rankNumber} ${
      rank === 1 ? styles.rankFirst : rank === 2 ? styles.rankSecond : styles.rankThird
    }`;
    const nameClass = `${styles.name} ${rank === 1 ? styles.nameFirst : ''}`;
    const returnClass = `${styles.returnRate} ${rank === 1 ? styles.returnFirst : ''} ${
      data.avgReturnRate >= 0 ? styles.returnPositive : styles.returnNegative
    }`;

    return (
      <Link
        href={data.linkPath || `/user/${encodeURIComponent(data.name)}`}
        className={cardClass}
      >
        <div className={rankClass}>{rank}</div>
        <div className={nameClass}>{data.name}</div>
        <div className={returnClass}>
          {data.avgReturnRate >= 0 ? '+' : ''}{data.avgReturnRate.toFixed(2)}%
        </div>
      </Link>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.podiumLayout}>
        {renderCard(second, 2)}
        {renderCard(first, 1)}
        {renderCard(third, 3)}
      </div>
    </div>
  );
});

export default Podium;
