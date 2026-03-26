import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Tablet, BookOpen, CreditCard, 
  TrendingUp, AlertCircle, Building2, MapPin,
  ChevronRight, Calendar, UserPlus, ArrowUpRight,
  RefreshCw, Activity, PieChart, Layers, ShieldCheck,
  Plus
} from 'lucide-react';
import apiClient from '../../services/api.client';
import { useAuth } from '../../context/AuthContext';

interface DashboardStats {
  members: { 
    total_count: number;
    active_count: number; 
    pending_count: number; 
    managed_count: number; 
    subscription_count: number;
    new_this_month: number;
  };
  tablets: { 
    total: number; 
    stock: number; 
    loaned: number; 
    repair: number; 
    lost: number;
    sub_store_counts?: Record<string, number>;
    brand_counts?: Record<string, { total: number; loaned: number; stock: number; repair: number }>;
  };
  content: { total_packages: number; published_packages: number; total_items: number };
  payments: { 
    total_revenue: number; 
    total_refunded: number; 
    pending_refunds: number;
    revenue_this_month: number;
  };
}

interface ActivityData {
  recentMembers: { id: string; name: string; member_number: string; member_type: string; member_status: string; created_at: string }[];
  recentLoans: { id: string; qr_code: string; member_name: string; action: string; created_at: string }[];
  pendingRefunds: { id: string; member_name: string; refund_amount: number; requested_at: string }[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const isSystemAdmin = adminUser?.role === 'system_admin';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminUser) return;
    
    const params = isSystemAdmin ? {} : { storeId: adminUser.store_id };
    
    Promise.all([
      apiClient.get<DashboardStats>('/dashboard/stats', { params }),
      apiClient.get<ActivityData>('/dashboard/activity', { params }),
    ]).then(([s, a]) => {
      setStats(s.data);
      setActivity(a.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [adminUser, isSystemAdmin]);

  if (loading) return (
    <div className="text-center py-20 text-gray-400 text-sm">로딩중...</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="text-blue-600" />
            {isSystemAdmin ? 'ITBook 통합 운영 본부' : '라스브러리 운영 현황'}
          </h2>
          <p className="text-sm text-gray-400 mt-2 font-medium flex items-center gap-1.5">
            <Calendar size={14} /> {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} 기준 데이터
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.reload()} 
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-blue-600 hover:shadow-md transition-all">
            <RefreshCw size={18} />
          </button>
          {!isSystemAdmin && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-2.5 rounded-2xl shadow-lg border border-blue-500/20">
              <Building2 size={20} className="text-white/80" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-white/60 font-mono tracking-widest leading-none mb-1">{adminUser?.store_code}</span>
                <span className="text-sm font-bold text-white leading-none">{adminUser?.store_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI 카드 섹션 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="활성 회원 규모" 
            value={stats.members.active_count} 
            subtitle={`이번 달 신규 +${stats.members.new_this_month ?? 0}`}
            icon={<Users className="text-white" />}
            gradient="from-blue-600 to-indigo-700"
            details={`전체 회원 ${stats.members.total_count}명 기반`}
          />
          <StatCard 
            title="태블릿 가동률" 
            value={stats.tablets.loaned} 
            subtitle={`보유 대비 ${Math.round((stats.tablets.loaned / stats.tablets.total) * 100) || 0}%`}
            icon={<Tablet className="text-white" />}
            gradient="from-orange-500 to-red-600"
            details={`미할당/재고 ${stats.tablets.stock}대`}
          />
          <StatCard 
            title="학습 패키지" 
            value={stats.content.published_packages} 
            subtitle={`콘텐츠 ${stats.content.total_items ?? 0}개`}
            icon={<BookOpen className="text-white" />}
            gradient="from-emerald-500 to-teal-700"
            details={`활성 패키지 / 전체 ${stats.content.total_packages}개`}
          />
          <StatCard 
            title={isSystemAdmin ? '전체 매출 현황' : '지점 매출 현황'} 
            value={`${Math.floor((stats.payments.total_revenue || 0) / 10000).toLocaleString()}만`} 
            subtitle={`이번 달 ${(Math.floor((stats.payments.revenue_this_month || 0) / 10000)).toLocaleString()}만`}
            icon={<CreditCard className="text-white" />}
            gradient="from-purple-600 to-fuchsia-700"
            details={`환불 대기건 포함 ${stats.payments.pending_refunds}건`}
          />
        </div>
      )}

      {/* 브랜드별 단말 관제 섹션 (Galaxy, iMuz 등) */}
      {stats?.tablets?.brand_counts && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Layers size={20} className="text-blue-600" />
              브랜드별 단말 운영 현황
            </h3>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1">Asset Distribution</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(stats.tablets.brand_counts).map(([brand, data]) => (
              <BrandCard key={brand} brand={brand} data={data} />
            ))}
            {/* 추가 기종 확장을 위한 Placeholder 느낌의 카드 (Optional) */}
            <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 opacity-60 hover:opacity-100 transition-opacity group cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-300 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
                <Plus size={24} />
              </div>
              <p className="text-[11px] font-black text-gray-400 mt-3 uppercase tracking-widest">Add New Device</p>
            </div>
          </div>
        </div>
      )}

      {/* 중간 섹션: 계층별 현항 파악 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 자본/자원 배분 현황 (SVG Donut Chart) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <PieChart size={18} className="text-blue-600" />
              회원 유형 분포
            </h3>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Type Ratio</span>
          </div>
          
          <div className="relative w-48 h-48 mb-10">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-50" strokeWidth="4" />
              {stats && (
                <>
                  {/* Managed % */}
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-blue-600 transition-all duration-1000" 
                    strokeWidth="4" strokeDasharray={`${Math.round((stats.members.managed_count / (stats.members.active_count || 1)) * 100)}, 100`} />
                  {/* Subscription % */}
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-teal-400 transition-all duration-1000" 
                    strokeWidth="4" 
                    strokeDasharray={`${Math.round((stats.members.subscription_count / (stats.members.active_count || 1)) * 100)}, 100`}
                    strokeDashoffset={`-${Math.round((stats.members.managed_count / (stats.members.active_count || 1)) * 100)}`}
                  />
                </>
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-gray-900 leading-none">{stats?.members?.active_count}</span>
              <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">Active Members</span>
            </div>
          </div>
          
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                <span className="text-xs font-bold text-gray-600">관리형 (Managed)</span>
              </div>
              <span className="text-sm font-black text-gray-900">{stats?.members.managed_count}명</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl hover:bg-teal-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.4)]" />
                <span className="text-xs font-bold text-gray-600">구독형 (Subscription)</span>
              </div>
              <span className="text-sm font-black text-gray-900">{stats?.members.subscription_count}명</span>
            </div>
          </div>
        </div>

        {/* 지점별/배분처별 흐름 파악 섹션 */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-950 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden relative border border-white/5">
            <div className="absolute -right-20 -bottom-20 opacity-[0.03]">
              <Layers size={320} className="text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex flex-col">
                  <h3 className="font-bold text-white text-lg flex items-center gap-3 tracking-tight">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                      <MapPin size={22} className="text-blue-400" />
                    </div>
                    {isSystemAdmin ? '전체 계층별 태블릿 배분율' : '라스몰/하위매장 배분 추이'}
                  </h3>
                  <p className="text-gray-500 text-xs mt-2 font-medium">상위 조직에서 하위 매장으로의 자원 흐름도</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-blue-400/60 bg-blue-400/10 px-3 py-1.5 rounded-xl border border-blue-400/20 uppercase tracking-widest">Hierarchical Flow</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {stats?.tablets?.sub_store_counts && Object.entries(stats.tablets.sub_store_counts).length > 0 ? 
                  Object.entries(stats.tablets.sub_store_counts).slice(0, 6).map(([name, count], idx) => {
                  const percentage = Math.round((count / (stats?.tablets?.total || 1)) * 100);
                  const colors = ['from-blue-500 to-blue-400', 'from-indigo-500 to-indigo-400', 'from-emerald-500 to-emerald-400', 'from-purple-500 to-purple-400', 'from-rose-500 to-rose-400', 'from-amber-500 to-amber-400'];
                  return (
                    <div key={name} className="group cursor-default">
                      <div className="flex justify-between items-end mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-white/20 font-mono">0{idx + 1}</span>
                          <span className="text-sm font-bold text-gray-400 group-hover:text-blue-300 transition-colors uppercase tracking-tight">{name}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-white">{count}</span>
                          <span className="text-[10px] font-bold text-gray-500">UNIT</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-3 p-0.5 overflow-hidden border border-white/5 relative">
                        <div className={`bg-gradient-to-r ${colors[idx % colors.length]} h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_15px_rgba(59,130,246,0.3)]`} 
                          style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="flex justify-end mt-1.5">
                        <span className="text-[10px] font-black text-gray-600">{percentage}% ALLOCATED</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-2 py-16 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <Activity className="mx-auto text-white/5 mb-4" size={48} />
                    <p className="text-gray-600 font-bold text-sm tracking-tight px-10">지점 산하의 매장(몰)이 등록되지 않았거나 배분 데이터가 존재하지 않습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-gray-900 flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
                    <AlertCircle size={20} />
                  </div>
                  운영 관제 현황
                </h3>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100 group-hover:border-orange-300 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-black text-orange-800 font-mono tracking-widest uppercase">Overdue Warning</p>
                      <span className="text-[10px] font-black text-orange-600 bg-white px-1.5 py-0.5 rounded border border-orange-100 italic">3 Cases</span>
                    </div>
                    <p className="text-sm font-bold text-orange-950 mt-1 leading-tight">장기 미반납 3건 감지 —<br/>지점별 연락망 확인이 필요합니다.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-700 to-blue-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                  <TrendingUp size={100} className="text-white" />
               </div>
               <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                      <Activity size={20} className="text-blue-200" />
                    </div>
                    <span className="text-xs font-bold text-blue-100/80 uppercase tracking-widest">System Voice</span>
                  </div>
                  <div className="mt-8">
                    <p className="text-white font-black text-base leading-snug">
                       "지점 운영 시 하위 매장(몰) 배분 현황을 최신화하여 자원 도난 및 분실을 미연에 방지해 주세요."
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-blue-300/60 font-black text-[10px] uppercase italic tracking-widest">
                       <ShieldCheck size={12} /> itbook Security Core
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pt-8">
        {activity && (
          <>
            <ActivityCard 
              title="최근 가입 멤버십" 
              icon={<UserPlus size={18} className="text-blue-600" />}
              onViewAll={() => navigate('/members')}
              empty={activity.recentMembers.length === 0}
            >
              <div className="space-y-4">
                {activity.recentMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between group cursor-pointer p-2 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                    onClick={() => navigate(`/members/${m.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-500 font-black text-sm group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white transition-all shadow-sm">
                        {m.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors tracking-tight">{m.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono italic tracking-tighter">{m.member_number}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </ActivityCard>

            <ActivityCard 
              title="실시간 자원 활동" 
              icon={<Activity size={18} className="text-orange-500" />}
              onViewAll={() => navigate('/tablets')}
              empty={activity.recentLoans.length === 0}
            >
              <div className="space-y-6 pt-2">
                {activity.recentLoans.map((l, idx) => (
                  <div key={l.id} className="flex gap-5 relative group">
                    {idx !== activity.recentLoans.length - 1 && <div className="absolute left-[9px] top-6 w-[2.5px] h-full bg-gray-50/80 rounded-full" />}
                    <div className="w-5 h-5 rounded-full bg-white border-[4px] border-orange-500 group-hover:scale-125 transition-transform shadow-lg shadow-orange-500/20 z-10" />
                    <div className="flex-1 translate-y-[-2px]">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-gray-900 font-mono tracking-widest">{l.qr_code}</p>
                        <span className="text-[9px] font-bold text-gray-300 uppercase">{l.created_at.slice(5, 10)}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-tight">
                        <span className="text-blue-600 font-black mr-1.5 opacity-80">{l.action}</span>
                        <span className="text-gray-400">by</span>
                        <span className="text-gray-800 font-bold ml-1">{l.member_name}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ActivityCard>

            <ActivityCard 
              title={isSystemAdmin ? "긴급 승인/환불 대기" : "본사 핵심 운영 이슈"} 
              icon={<ShieldCheck size={18} className={isSystemAdmin ? "text-red-500" : "text-indigo-600"} />}
              onViewAll={() => navigate(isSystemAdmin ? '/payments/refunds' : '/dashboard')}
              empty={isSystemAdmin ? activity.pendingRefunds.length === 0 : false}
            >
              <div className="space-y-5">
                {isSystemAdmin ? (
                  activity.pendingRefunds.map(r => (
                    <div key={r.id} className="p-4 bg-gradient-to-br from-red-50 to-white/50 rounded-2xl border border-red-100 flex items-center justify-between group hover:shadow-lg hover:shadow-red-500/5 transition-all cursor-pointer"
                      onClick={() => navigate('/payments/refunds')}>
                      <div>
                        <p className="text-sm font-black text-gray-950 group-hover:text-red-600 transition-colors tracking-tight">{r.member_name}</p>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-[0.15em] mt-1 italic">Action Required</p>
                      </div>
                      <p className="text-xl font-black text-red-600 tracking-tighter">{r.refund_amount.toLocaleString()}<span className="text-[10px] text-red-400 ml-1">₩</span></p>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                     <div className="p-5 bg-gradient-to-br from-indigo-700 to-indigo-950 rounded-3xl shadow-2xl relative overflow-hidden group border border-white/5">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                           <AlertCircle size={60} className="text-white" />
                        </div>
                        <h4 className="text-white font-black text-sm mb-3 flex items-center gap-2 tracking-wide">
                           <Building2 size={16} className="text-indigo-300" />
                           지점별 배분처 최신화 공지
                        </h4>
                        <p className="text-xs text-indigo-100/70 leading-relaxed font-bold tracking-tight">
                           모든 지점은 산하 몰/매장의 태블릿 실질 소유 현황을 [태블릿 관리] 메뉴를 통해 주 1회 업데이트해 주시기 바랍니다.
                        </p>
                        <div className="mt-5 flex items-center justify-between">
                           <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">ITBook Core HQ</span>
                           <ArrowUpRight size={14} className="text-white" />
                        </div>
                     </div>
                  </div>
                )}
              </div>
            </ActivityCard>
          </>
        )}
      </div>
    </div>
  );
}

function BrandCard({ brand, data }: { brand: string, data: any }) {
  const isGalaxy = brand.toLowerCase().includes('galaxy');
  const isIMuz = brand.toLowerCase().includes('imuz');
  
  const loanRate = Math.round((data.loaned / (data.total || 1)) * 100);
  
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-7 group hover:shadow-xl hover:translate-y-[-6px] transition-all duration-500 overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${isGalaxy ? 'from-blue-600/5 to-transparent' : 'from-indigo-600/5 to-transparent'} rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150`} />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
            isGalaxy ? 'bg-gradient-to-br from-blue-700 to-blue-900 text-white shadow-blue-500/20' : 
            isIMuz ? 'bg-gradient-to-br from-indigo-700 to-purple-900 text-white shadow-indigo-500/20' :
            'bg-gray-800 text-white'
          }`}>
            <Tablet size={24} />
          </div>
          <div>
            <h4 className="font-black text-gray-900 text-lg tracking-tight uppercase">{brand}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${loanRate > 80 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Availability: {data.stock} Unit</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-gray-900 leading-none">{data.total}</p>
          <p className="text-[9px] font-black text-gray-300 mt-1 uppercase">Total Asset</p>
        </div>
      </div>

      <div className="space-y-5 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-2xl p-3 text-center transition-colors group-hover:bg-white border border-transparent group-hover:border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Loaned</p>
            <p className="text-base font-black text-gray-900">{data.loaned}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center transition-colors group-hover:bg-white border border-transparent group-hover:border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Stock</p>
            <p className="text-base font-black text-gray-900">{data.stock}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center transition-colors group-hover:bg-red-50 border border-transparent group-hover:border-red-100">
            <p className="text-[9px] font-black text-red-300 uppercase mb-1">Repair</p>
            <p className="text-base font-black text-red-600">{data.repair}</p>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Operational Efficiency</span>
            <span className="text-xs font-black text-blue-600">{loanRate}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full p-0.5 overflow-hidden border border-gray-50 shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                isGalaxy ? 'bg-blue-600 shadow-blue-500/20' : 'bg-indigo-600 shadow-indigo-500/20'
              }`} 
              style={{ width: `${loanRate}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, gradient, details }: any) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:translate-y-[-4px] transition-all duration-500 cursor-default">
      <div className="p-7">
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
            {icon}
          </div>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">Update</span>
        </div>
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.1em]">{title}</h3>
          <p className="text-4xl font-black text-gray-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">{value}</p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{subtitle}</span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50/50 px-7 py-4 border-t border-gray-100/50">
        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-2 uppercase tracking-tight">
          <TrendingUp size={12} />
          {details}
        </p>
      </div>
    </div>
  );
}

function ActivityCard({ title, icon, onViewAll, children, empty }: any) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 group overflow-hidden relative">
      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="font-bold text-gray-900 flex items-center gap-3 text-sm tracking-tight">
          <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
            {icon}
          </div>
          {title}
        </h3>
        <button onClick={onViewAll} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white transition-all">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="relative z-10">
        {empty ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-300">
            <AlertCircle size={40} strokeWidth={1} />
            <p className="text-[11px] mt-3 font-bold uppercase tracking-wider">Empty Log</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
