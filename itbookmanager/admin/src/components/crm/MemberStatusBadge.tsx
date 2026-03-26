const STATUS_MAP = {
  pending:            { label: '가입대기', cls: 'bg-yellow-100 text-yellow-800' },
  active:             { label: '정상',     cls: 'bg-green-100 text-green-800' },
  suspended:          { label: '일시중단', cls: 'bg-orange-100 text-orange-800' },
  pending_withdrawal: { label: '탈퇴대기', cls: 'bg-red-50 text-red-500 ring-1 ring-red-300' },
  ended:              { label: '종료',     cls: 'bg-gray-100 text-gray-600' },
  withdrawn:          { label: '탈퇴',     cls: 'bg-red-100 text-red-700' },
};

const TYPE_MAP = {
  managed:      { label: '관리회원', cls: 'bg-purple-100 text-purple-800' },
  subscription: { label: '구독회원', cls: 'bg-blue-100 text-blue-800' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status as keyof typeof STATUS_MAP] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  const t = TYPE_MAP[type as keyof typeof TYPE_MAP] ?? { label: type, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${t.cls}`}>{t.label}</span>;
}
