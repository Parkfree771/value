'use client';

type Status = 'NEW BUY' | 'SOLD OUT' | 'ADD' | 'TRIM' | 'HOLD';

const STATUS_CLASS: Record<Status, string> = {
  'NEW BUY': 'badge-buy',
  'ADD': 'badge-buy',
  'SOLD OUT': 'badge-sell',
  'TRIM': 'badge-sell',
  'HOLD': 'badge-hold',
};

const STATUS_LABELS: Record<Status, string> = {
  'NEW BUY': '신규매수',
  'SOLD OUT': '전량매도',
  'ADD': '비중확대',
  'TRIM': '비중축소',
  'HOLD': '유지',
};

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`${STATUS_CLASS[status]} !text-[9px] sm:!text-[10px] !px-1.5 !py-0.5 whitespace-nowrap`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
