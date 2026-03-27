const STATUS_MAP = {
  stock:    { label: '재고',    cls: 'bg-green-100 text-green-800' },
  loaned:   { label: '대여중', cls: 'bg-blue-100 text-blue-800' },
  returned: { label: '회수됨', cls: 'bg-gray-100 text-gray-600' },
  repair:   { label: '수리중', cls: 'bg-yellow-100 text-yellow-700' },
  lost:     { label: '분실',   cls: 'bg-red-100 text-red-700' },
  assigned: { label: '배정',   cls: 'bg-indigo-100 text-indigo-800' },
};

const ACTION_MAP: Record<string, string> = {
  loaned: '대여',
  returned: '반납',
  lost_reported: '분실신고',
  recovered: '회수',
};

export function TabletStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status as keyof typeof STATUS_MAP] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export function ActionLabel({ action }: { action: string }) {
  return <span className="text-xs text-gray-600">{ACTION_MAP[action] ?? action}</span>;
}
