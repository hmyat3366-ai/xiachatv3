import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SocialProofSection } from './components/SocialProofSection';
import { ProblemSection } from './components/ProblemSection';
import { SolutionSection } from './components/SolutionSection';
import { AIHumanSection } from './components/AIHumanSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { UseCasesSection } from './components/UseCasesSection';
import { ProductShowcaseSection } from './components/ProductShowcaseSection';
import { PricingSection } from './components/PricingSection';
import { FAQSection } from './components/FAQSection';
import { FinalCTASection } from './components/FinalCTASection';
import { Footer } from './components/Footer';
import { LeadModal } from './components/LeadModal';
import { FeedbackWidget } from './components/FeedbackModal';
import { AuthPage, type AuthPageMode } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { Dashboard } from './pages/Dashboard';
import {
  InboxPage,
  KnowledgeBasePage,
  AnalyticsPage,
  TeamPage,
  BillingPage,
  SettingsPage,
  CustomersPage,
  AIAgentsPage,
  ChannelsPage,
} from './pages/ProtectedPages';
import { TeamChatPage } from './pages/TeamChatPage';
import { Logo } from './components/Logo';
import { Loader2 } from 'lucide-react';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/inbox',
  '/customers',
  '/ai-agents',
  '/channels',
  '/channels/website',
  '/settings',
  '/settings/billing',
  '/settings/workspace',
  '/settings/profile',
  '/settings/notifications',
  '/settings/security',
  '/settings/ai',
  '/settings/privacy',
  '/settings/account',
  '/knowledge-base',
  '/analytics',
  '/team',
  '/team-members',
  '/team-chat',
  '/billing',
];

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

function MainApp() {
  const { user, isAuthenticated, isLoading, refreshSession } = useAuth();

  // Navigation State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Auth Page Mode State
  const [authMode, setAuthMode] = useState<AuthPageMode>('login');
  const [resetToken, setResetToken] = useState('');

  // Lead / Demo Modal State
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadModalMode, setLeadModalMode] = useState<'start_free' | 'book_demo'>('start_free');

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle URL changes and URL query parameters (e.g. reset token or OAuth parameters)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);

    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    const authError = searchParams.get('auth_error');
    const authSuccess = searchParams.get('auth');

    if (token) {
      setResetToken(token);
      setAuthMode('reset_password');
      navigate('/reset-password');
    }

    if (authSuccess === 'google_success') {
      refreshSession();
    }

    if (authError) {
      setAuthMode('login');
      navigate('/login');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [refreshSession]);

  const openAuthPage = (mode: AuthPageMode = 'login') => {
    if (isAuthenticated) {
      if (user && !user.onboardingCompleted) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    setAuthMode(mode);
    navigate(`/${mode === 'forgot_password' ? 'forgot-password' : mode === 'reset_password' ? 'reset-password' : mode}`);
  };

  const openStartFreeModal = () => {
    if (!isAuthenticated) {
      openAuthPage('signup');
    } else {
      if (user && !user.onboardingCompleted) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const openBookDemoModal = () => {
    setLeadModalMode('book_demo');
    setIsLeadModalOpen(true);
  };

  // 1. SESSION CHECK LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center space-y-4">
        <Logo variant="full" size="lg" className="animate-pulse" />
        <div className="flex items-center gap-2 text-sm font-bold text-[#171717]">
          <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
          <span>Securing Xia Chat Session...</span>
        </div>
      </div>
    );
  }

  // 2. ONBOARDING ROUTE GUARDS & RENDERING
  const isOnboardingRoute = currentPath === '/onboarding';

  // Case: Authenticated user who has NOT completed onboarding must be guided through /onboarding
  if (isAuthenticated && user && !user.onboardingCompleted) {
    return <OnboardingPage onNavigate={navigate} />;
  }

  // Case: Authenticated user who HAS completed onboarding accessing /onboarding -> redirect to /dashboard
  if (isAuthenticated && user && user.onboardingCompleted && isOnboardingRoute) {
    navigate('/dashboard');
  }

  // Case: Unauthenticated user accessing /onboarding -> redirect to /login
  if (!isAuthenticated && isOnboardingRoute) {
    return (
      <AuthPage
        initialMode="login"
        onNavigate={navigate}
      />
    );
  }

  // 3. AUTH ROUTES (LOGIN, SIGNUP, FORGOT/RESET PASSWORD)
  const isAuthRoute = AUTH_ROUTES.includes(currentPath);

  // Authenticated user accessing auth routes -> redirect to onboarding or dashboard based on user state
  if (isAuthRoute && isAuthenticated) {
    if (user && !user.onboardingCompleted) {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  }

  // Render Full-Screen Dedicated Authentication Page for unauthenticated visitors
  if (isAuthRoute && !isAuthenticated) {
    let modeFromPath: AuthPageMode = 'login';
    if (currentPath === '/signup') modeFromPath = 'signup';
    if (currentPath === '/forgot-password') modeFromPath = 'forgot_password';
    if (currentPath === '/reset-password') modeFromPath = 'reset_password';

    return (
      <AuthPage
        initialMode={modeFromPath || authMode}
        resetToken={resetToken}
        onNavigate={navigate}
      />
    );
  }

  // 4. PROTECTED ROUTES REDIRECT FOR UNAUTHENTICATED USERS
  const isProtectedRoute = PROTECTED_ROUTES.includes(currentPath);

  if (isProtectedRoute && !isAuthenticated) {
    return (
      <AuthPage
        initialMode="login"
        onNavigate={navigate}
      />
    );
  }

  // 5. RENDER PROTECTED ROUTE VIEWS FOR AUTHENTICATED USERS (ONBOARDING COMPLETED)
  if (isAuthenticated && isProtectedRoute) {
    switch (currentPath) {
      case '/dashboard':
        return <Dashboard currentPath={currentPath} onNavigate={navigate} />;
      case '/inbox':
        return <InboxPage onNavigate={navigate} />;
      case '/customers':
        return <CustomersPage onNavigate={navigate} />;
      case '/ai-agents':
        return <AIAgentsPage onNavigate={navigate} />;
      case '/channels':
      case '/channels/website':
        return <ChannelsPage onNavigate={navigate} />;
      case '/knowledge-base':
        return <KnowledgeBasePage onNavigate={navigate} />;
      case '/analytics':
        return <AnalyticsPage onNavigate={navigate} />;
      case '/team':
      case '/team-members':
        return <TeamPage onNavigate={navigate} />;
      case '/team-chat':
        return <TeamChatPage onNavigate={navigate} />;
      case '/billing':
      case '/settings/billing':
        return <BillingPage onNavigate={navigate} />;
      case '/settings':
      case '/settings/workspace':
      case '/settings/profile':
      case '/settings/notifications':
      case '/settings/security':
      case '/settings/ai':
      case '/settings/privacy':
      case '/settings/account':
        return <SettingsPage onNavigate={navigate} />;
      default:
        return <Dashboard currentPath={currentPath} onNavigate={navigate} />;
    }
  }

  // 6. RENDER LANDING PAGE FOR PUBLIC ROUTE
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#171717] selection:bg-[#FFF0E5] selection:text-[#D96512] relative">
      {/* Navigation Bar */}
      <Navbar
        onOpenCTA={() => openAuthPage('login')}
        onOpenSignup={() => openAuthPage('signup')}
        onNavigate={navigate}
      />

      {/* Main Page Storytelling Sequence */}
      <main>
        {/* 1. Hero */}
        <HeroSection onStartFree={openStartFreeModal} onBookDemo={openBookDemoModal} />

        {/* 2. Social Proof */}
        <SocialProofSection />

        {/* 3. Problem */}
        <ProblemSection />

        {/* 4. Solution (Unified Inbox Flagship) */}
        <SolutionSection />

        {/* 5. AI + Human Collaboration */}
        <AIHumanSection />

        {/* 6. Features */}
        <FeaturesSection />

        {/* 7. How It Works */}
        <HowItWorksSection />

        {/* 8. Use Cases */}
        <UseCasesSection />

        {/* 9. Product Showcase */}
        <ProductShowcaseSection />

        {/* 10. Pricing */}
        <PricingSection onStartFree={openStartFreeModal} onContact={openBookDemoModal} />

        {/* 11. FAQ */}
        <FAQSection />

        {/* 12. Final CTA */}
        <FinalCTASection onStartFree={openStartFreeModal} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Demo / Lead Modal */}
      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        initialMode={leadModalMode}
      />

      {/* Floating Usability Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
