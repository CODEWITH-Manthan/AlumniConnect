
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, GraduationCap, Briefcase, MessageSquare, Search,
  TrendingUp, Shield, AlertTriangle, CheckCircle, Clock,
  BarChart3, Activity, UserCheck, UserX, Loader2,
  ChevronRight, Eye, Trash2, BookOpen, Award
} from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, where, deleteDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { incrementStat, decrementStat } from '@/lib/stats';

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedStat({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const duration = 1200;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  title, value, icon: Icon, color, trend, subtitle
}: {
  title: string; value: number | string; icon: React.ElementType;
  color: string; trend?: string; subtitle?: string;
}) {
  return (
    <Card className={cn('border-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative', color)}>
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-80">{title}</CardTitle>
        <div className="p-2 bg-white/10 rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black font-headline">
          {typeof value === 'number' ? <AnimatedStat value={value} label={title} /> : value}
        </div>
        {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-80">
            <TrendingUp className="h-3 w-3" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ user: u, currentUserId, onRoleChange, onRemoveUser }: {
  user: Record<string, string>;
  currentUserId: string;
  onRoleChange: (uid: string, role: string) => void;
  onRemoveUser: (uid: string) => void;
}) {
  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    alumni: 'bg-primary/10 text-primary border-primary/20',
    mentor: 'bg-secondary/10 text-secondary border-secondary/20',
    student: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 flex-shrink-0">
        {u.firstName?.[0]}{u.lastName?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">{u.firstName} {u.lastName}</p>
          {(u as any).emailVerified && <span title="Email Verified"><CheckCircle className="h-3 w-3 text-green-600" /></span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
      </div>
      <Badge className={cn('text-[10px] uppercase font-black tracking-wider border capitalize px-2 py-0.5', roleColors[u.role] || roleColors.student)}>
        {u.role || 'student'}
      </Badge>
      {u.uid !== currentUserId && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {u.role !== 'admin' && (
             <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const uid = u.uid || (u as any).id;
                if (uid) onRoleChange(uid, u.role === 'alumni' ? 'student' : 'alumni');
              }}
              title={u.role === 'alumni' ? "Demote to student" : "Promote to alumni"}
            >
              {u.role === 'alumni' ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
            </Button>
          )}
          {u.role !== 'admin' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                const uid = u.uid || (u as any).id;
                if (uid && window.confirm(`Are you sure you want to completely remove ${u.firstName} ${u.lastName}?`)) {
                  onRemoveUser(uid);
                }
              }}
              title="Remove User"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'alumni' | 'students' | 'content' | 'activity'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ── Auth guard ──
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    if (!isUserLoading && !isUserDataLoading && user && userData && !isAdmin) {
      router.replace('/');
    }
  }, [isUserLoading, isUserDataLoading, user, userData, isAdmin, router]);

  // ── Global stats ──
  const statsDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'stats', 'global');
  }, [firestore, user]);
  const { data: globalStats } = useDoc(statsDocRef);

  // ── All users ──
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isAdmin) return null;
    return query(collection(firestore, 'users'), orderBy('firstName'), limit(100));
  }, [firestore, user, isAdmin]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersQuery);

  // ── Recent opportunities ──
  const oppsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isAdmin) return null;
    return query(collection(firestore, 'opportunities'), orderBy('datePosted', 'desc'), limit(20));
  }, [firestore, user, isAdmin]);
  const { data: opportunities } = useCollection(oppsQuery);

  // ── Recent guidance requests ──
  const guidanceQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isAdmin) return null;
    return query(collection(firestore, 'guidanceRequests'), orderBy('datePosted', 'desc'), limit(20));
  }, [firestore, user, isAdmin]);
  const { data: guidanceRequests } = useCollection(guidanceQuery);

  // ── Derived counts ──
  const alumniUsers = allUsers?.filter(u => u.role === 'alumni') || [];
  const studentUsers = allUsers?.filter(u => !u.role || u.role === 'student') || [];
  const adminUsers = allUsers?.filter(u => u.role === 'admin') || [];
  const nonAdminUsers = allUsers?.filter(u => u.role !== 'admin') || [];

  const filteredUsers = allUsers?.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAlumni = alumniUsers.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = studentUsers.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Handlers ──
  const handleRoleChange = (uid: string, newRole: string) => {
    if (!firestore || !uid) return;
    const ref = doc(firestore, 'users', uid);
    
    // Find the user to check their current role
    const targetUser = allUsers?.find(u => (u.uid || (u as any).id) === uid);
    const currentRole = targetUser?.role || 'student';
    
    updateDocumentNonBlocking(ref, { role: newRole });
    
    // Update alumni count stats
    if (newRole === 'alumni' && currentRole !== 'alumni') {
      incrementStat(firestore, { alumniCount: 1 });
    } else if (currentRole === 'alumni' && newRole !== 'alumni') {
      decrementStat(firestore, { alumniCount: 1 });
    }
    
    toast({
      title: 'Role updated',
      description: `User role changed to ${newRole}.`,
    });
  };

  const handleRemoveUser = async (uid: string) => {
    if (!firestore || !uid) return;
    try {
      await deleteDoc(doc(firestore, 'users', uid));
      toast({
        title: 'User removed',
        description: 'The user has been successfully removed from the database.',
      });
    } catch (error) {
      console.error("Error removing user:", error);
      toast({
        variant: "destructive",
        title: 'Error removing user',
        description: 'Ensure you have permissions or try again.',
      });
    }
  };

  const handleCleanup = async () => {
    if (!firestore || !window.confirm("Are you sure you want to delete all John Doe dummy content and unverified alumni? This cannot be undone.")) return;
    
    let deletedCount = 0;
    
    // 1. Delete John Doe opportunities
    const oppsToDelete = opportunities?.filter(o => o.postedBy?.toLowerCase().includes('john doe')) || [];
    for (const opp of oppsToDelete) {
      await deleteDoc(doc(firestore, 'opportunities', opp.id));
      deletedCount++;
    }

    // 2. Delete John Doe guidance requests
    const reqsToDelete = guidanceRequests?.filter(r => r.studentName?.toLowerCase().includes('john doe')) || [];
    for (const req of reqsToDelete) {
      await deleteDoc(doc(firestore, 'guidanceRequests', req.id));
      deletedCount++;
    }

    // 3. Delete unverified alumni & john doe users
    const usersToDelete = allUsers?.filter(u => 
      (u.firstName?.toLowerCase() === 'john' && u.lastName?.toLowerCase() === 'doe') ||
      (u.role === 'alumni' && !u.emailVerified)
    ) || [];

    for (const u of usersToDelete) {
      const uid = u.uid || (u as any).id;
      if (uid) {
        await deleteDoc(doc(firestore, 'users', uid));
        deletedCount++;
      }
    }

    toast({
      title: 'Cleanup Complete',
      description: `Successfully removed ${deletedCount} dummy records.`,
    });
  };

  // ── Loading / access denied states ──
  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Checking permissions…</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="bg-destructive/10 p-4 rounded-2xl">
            <Shield className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-headline font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
          <Button asChild className="rounded-full">
            <Link href="/">Go Back Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'All Users', icon: Users },
    { id: 'alumni', label: 'Alumni', icon: GraduationCap },
    { id: 'students', label: 'Students', icon: Award },
    { id: 'content', label: 'Content', icon: BookOpen },
    { id: 'activity', label: 'Activity', icon: Activity },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header Banner ── */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="container mx-auto px-4 py-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                  <Shield className="h-6 w-6" />
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-xs font-black uppercase tracking-widest">
                  Admin Panel
                </Badge>
              </div>
              <h1 className="text-3xl font-black font-headline">Control Centre</h1>
              <p className="text-primary-foreground/70 mt-1 text-sm">
                Manage your AlumniConnect platform, users, and content
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 text-sm">
                <p className="text-primary-foreground/70 text-xs uppercase tracking-widest font-bold mb-0.5">Logged in as</p>
                <p className="font-bold">{userData?.firstName} {userData?.lastName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-16 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* ═══════════════════════════════════ OVERVIEW TAB ══════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={nonAdminUsers.length}
                icon={Users}
                color="bg-primary text-primary-foreground"
                trend="Platform members"
                subtitle={`${adminUsers.length} admins (excluded)`}
              />
              <StatCard
                title="Alumni & Mentors"
                value={alumniUsers.length}
                icon={GraduationCap}
                color="bg-secondary text-secondary-foreground"
                trend="Verified graduates"
                subtitle="Active contributors"
              />
              <StatCard
                title="Students"
                value={studentUsers.length}
                icon={Award}
                color="bg-accent text-accent-foreground"
                trend="Learners"
                subtitle="Seeking opportunities"
              />
              <StatCard
                title="Open Roles"
                value={globalStats?.openRoles ?? 0}
                icon={Briefcase}
                color="bg-card border text-foreground"
                trend="Posted by alumni"
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Platform Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Verified Alumni', count: alumniUsers.filter(u => u.emailVerified).length, total: alumniUsers.length, color: 'bg-secondary' },
                    { label: 'Open Opportunities', count: globalStats?.openRoles ?? 0, total: null, color: 'bg-primary' },
                    { label: 'Community Posts', count: globalStats?.activeDiscussions ?? 0, total: null, color: 'bg-accent' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{item.label}</span>
                        <span className="font-bold text-foreground">
                          {item.count}{item.total ? `/${item.total}` : ''}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-1000', item.color)}
                          style={{ width: item.total ? `${Math.round((item.count / item.total) * 100)}%` : '70%' }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> Content Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Opportunities', value: opportunities?.length || 0, icon: Briefcase, color: 'text-primary' },
                      { label: 'Discussions', value: guidanceRequests?.length || 0, icon: MessageSquare, color: 'text-secondary' },
                      { label: 'Alumni Posts', value: opportunities?.filter(o => o.alumniId)?.length || 0, icon: UserCheck, color: 'text-accent' },
                      { label: 'Active Alumni', value: alumniUsers.length, icon: GraduationCap, color: 'text-primary' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="bg-muted/30 rounded-xl p-3">
                          <Icon className={cn('h-4 w-4 mb-1', item.color)} />
                          <p className="text-xl font-black">{item.value}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Recent Signups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(allUsers || []).slice(0, 5).map((u, idx) => (
                      <div key={u.uid || (u as any).id || idx} className="flex items-center gap-2 py-1">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{u.firstName} {u.lastName}</p>
                        </div>
                        <Badge className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0 h-4 capitalize bg-primary/10 text-primary border-none">
                          {u.role || 'student'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Manage Users', icon: Users, action: () => setActiveTab('users'), color: 'bg-primary/5 hover:bg-primary/10 text-primary border-primary/20' },
                    { label: 'View Alumni', icon: GraduationCap, action: () => setActiveTab('alumni'), color: 'bg-secondary/5 hover:bg-secondary/10 text-secondary border-secondary/20' },
                    { label: 'Review Content', icon: BookOpen, action: () => setActiveTab('content'), color: 'bg-accent/5 hover:bg-accent/10 text-accent border-accent/20' },
                    { label: 'Activity Log', icon: Activity, action: () => setActiveTab('activity'), color: 'bg-muted hover:bg-muted/80 text-muted-foreground border-border' },
                    { label: 'Deep Clean', icon: Trash2, action: handleCleanup, color: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' },
                  ].map((actionItem) => {
                    const Icon = actionItem.icon;
                    return (
                      <button
                        key={actionItem.label}
                        onClick={actionItem.action}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-sm font-bold',
                          actionItem.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {actionItem.label}
                        {actionItem.label === 'Deep Clean' ? null : <ChevronRight className="h-3 w-3 opacity-50" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════ ALL USERS TAB ══════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div>
                <h2 className="text-2xl font-bold font-headline text-primary">All Users</h2>
                <p className="text-muted-foreground text-sm">{allUsers?.length || 0} registered members</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Role summary badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Admin', count: adminUsers.length, color: 'bg-red-50 text-red-700 border-red-200' },
                { label: 'Alumni', count: allUsers?.filter(u => u.role === 'alumni').length || 0, color: 'bg-primary/10 text-primary border-primary/20' },
                { label: 'Mentor', count: 0, color: 'bg-secondary/10 text-secondary border-secondary/20' },
                { label: 'Student', count: studentUsers.length, color: 'bg-muted text-muted-foreground border-border' },
              ].map(item => (
                <Badge key={item.label} className={cn('px-3 py-1 border text-xs font-bold capitalize', item.color)}>
                  {item.label}: {item.count}
                </Badge>
              ))}
            </div>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                {isUsersLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="divide-y">
                    {filteredUsers.map((u, idx) => (
                      <UserRow
                        key={u.uid || (u as any).id || idx}
                        user={u as Record<string, string>}
                        currentUserId={user.uid}
                        onRoleChange={handleRoleChange}
                        onRemoveUser={handleRemoveUser}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════ ALUMNI TAB ══════════════════════════════════ */}
        {activeTab === 'alumni' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div>
                <h2 className="text-2xl font-bold font-headline text-primary">Alumni & Mentors</h2>
                <p className="text-muted-foreground text-sm">{alumniUsers.length} verified graduates and mentors</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alumni…"
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAlumni.length > 0 ? filteredAlumni.map((u, idx) => (
                <Card key={u.uid || (u as any).id || idx} className="border-none shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg border border-primary/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <Badge className={cn(
                          'mt-1 text-[9px] uppercase font-black tracking-wider border px-2 py-0.5 capitalize',
                          u.role === 'mentor' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-primary/10 text-primary border-primary/20'
                        )}>
                          {u.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {u.fieldOfWorking && (
                        <div className="bg-muted/30 rounded-lg p-2 col-span-2">
                          <p className="text-muted-foreground mb-0.5">Field of Working</p>
                          <p className="font-bold truncate">{u.fieldOfWorking}</p>
                        </div>
                      )}
                      {u.company && (
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-muted-foreground mb-0.5">Company</p>
                          <p className="font-bold truncate">{u.company}</p>
                        </div>
                      )}
                      {u.graduationYear && (
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-muted-foreground mb-0.5">Batch</p>
                          <p className="font-bold">{u.graduationYear}</p>
                        </div>
                      )}
                      {u.location && (
                        <div className="bg-muted/30 rounded-lg p-2 col-span-2">
                          <p className="text-muted-foreground mb-0.5">Location</p>
                          <p className="font-bold truncate">{u.location}</p>
                        </div>
                      )}
                    </div>
                    {u.emailVerified && (
                      <div className="flex items-center gap-1 mt-3 text-[10px] text-green-600 font-bold">
                        <CheckCircle className="h-3 w-3" /> Email Verified
                      </div>
                    )}
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-3 text-center py-20 text-muted-foreground">
                  <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No alumni found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════ STUDENTS TAB ══════════════════════════════════ */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div>
                <h2 className="text-2xl font-bold font-headline text-primary">Students</h2>
                <p className="text-muted-foreground text-sm">{studentUsers.length} registered students</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students…"
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.length > 0 ? filteredStudents.map((u, idx) => (
                <Card key={u.uid || (u as any).id || idx} className="border-none shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-black text-lg border border-accent/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <Badge className="mt-1 text-[9px] uppercase font-black tracking-wider border px-2 py-0.5 bg-muted text-muted-foreground border-border">
                          Student
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {u.department && (
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-muted-foreground mb-0.5">Department</p>
                          <p className="font-bold truncate">{u.department}</p>
                        </div>
                      )}
                      {(u.graduationYear || u.gdy) && (
                        <div className="bg-muted/30 rounded-lg p-2">
                          <p className="text-muted-foreground mb-0.5">Grad Year</p>
                          <p className="font-bold">{u.graduationYear || u.gdy}</p>
                        </div>
                      )}
                    </div>
                    {(u.skills || []).length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {(u.skills || []).slice(0, 4).map((s: string) => (
                            <span key={s} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{s}</span>
                          ))}
                          {(u.skills || []).length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{(u.skills || []).length - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      {u.emailVerified ? (
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                          <CheckCircle className="h-3 w-3" /> Email Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-yellow-600 font-bold">
                          <AlertTriangle className="h-3 w-3" /> Not Verified
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const uid = u.uid || (u as any).id;
                          if (uid) handleRoleChange(uid, 'alumni');
                        }}
                        title="Promote to alumni"
                      >
                        <UserCheck className="h-3 w-3 mr-1" /> Promote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-3 text-center py-20 text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No students found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════ CONTENT TAB ══════════════════════════════════ */}
        {activeTab === 'content' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold font-headline text-primary">Content Overview</h2>

            {/* Opportunities */}
            <div>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Recent Opportunities
                <Badge className="bg-primary/10 text-primary border-none">{opportunities?.length || 0}</Badge>
              </h3>
              <div className="space-y-3">
                {(opportunities || []).slice(0, 8).map((opp) => (
                  <Card key={opp.id} className="border-none shadow-sm group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0',
                          opp.type === 'Internship' ? 'bg-secondary/10 text-secondary' :
                          'bg-teal-100 text-teal-700'
                        )}>
                          {opp.type}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{opp.title}</p>
                          <p className="text-xs text-muted-foreground">{opp.company} · Posted by {opp.postedBy}</p>
                        </div>
                        {mounted && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {new Date(opp.datePosted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Guidance Requests */}
            <div>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-secondary" /> Recent Guidance Requests
                <Badge className="bg-secondary/10 text-secondary border-none">{guidanceRequests?.length || 0}</Badge>
              </h3>
              <div className="space-y-3">
                {(guidanceRequests || []).slice(0, 8).map((req) => (
                  <Card key={req.id} className="border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xs flex-shrink-0">
                          {req.studentName?.[0] || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{req.title}</p>
                          <p className="text-xs text-muted-foreground">By {req.studentName} · {req.likes || 0} likes</p>
                        </div>
                        {mounted && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {new Date(req.datePosted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════ ACTIVITY TAB ══════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-headline text-primary">Activity Feed</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent opportunities as activity */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Latest Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(opportunities || []).slice(0, 6).map((opp) => (
                      <div key={opp.id} className="flex items-start gap-2.5 pb-3 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {opp.postedBy?.[0] || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{opp.postedBy} posted an opportunity</p>
                          <p className="text-xs text-muted-foreground truncate">{opp.title} at {opp.company}</p>
                          {mounted && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(opp.datePosted).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent guidance as activity */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-secondary" /> Community Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(guidanceRequests || []).slice(0, 6).map((req) => (
                      <div key={req.id} className="flex items-start gap-2.5 pb-3 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xs font-bold flex-shrink-0">
                          {req.studentName?.[0] || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{req.studentName} asked a question</p>
                          <p className="text-xs text-muted-foreground truncate">{req.title}</p>
                          {mounted && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(req.datePosted).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform stats summary */}
            <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Platform Totals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Alumni Count', value: globalStats?.alumniCount ?? alumniUsers.length },
                    { label: 'Open Roles', value: globalStats?.openRoles ?? opportunities?.length ?? 0 },
                    { label: 'Discussions', value: globalStats?.activeDiscussions ?? guidanceRequests?.length ?? 0 },
                  ].map(item => (
                    <div key={item.label} className="bg-white/10 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black font-headline">{item.value}</p>
                      <p className="text-xs opacity-70 font-medium">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
