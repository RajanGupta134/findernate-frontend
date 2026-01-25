import { Home,Clapperboard, Search, MessageCircle, User, TrendingUp, Building, Package, Bookmark, Bell, Wrench, ShoppingBag} from 'lucide-react';


export const navigationItems = [
  { icon: Home, label: 'Home', route: '/'},
  { icon: Clapperboard, label: 'Reels', route: '/reels'},
  { icon: Search, label: 'Search', route: '/search'},
  { icon: MessageCircle, label: 'Messages', route: '/chats'},
  { icon: Bell, label: 'Notifications', route: '/notifications'},
  { icon: ShoppingBag, label: 'Orders', route: '/orders'},
  { icon: User, label: 'Profile', route: '/profile'},
];

export const discoverItems = [
  { icon: TrendingUp, label: 'Trending', route: '/trending' },
  { icon: Building, label: 'Businesses', route: '/businesses' },
  { icon: Package, label: 'Products', route: '/products' },
  { icon: Wrench, label: 'Services', route: '/services' },
  // { icon: ShoppingBag, label: 'Marketplace', route: '/marketplace' },
  // { icon: Bookmark, label: 'Saved', route: '/saved' },
];

export const DEFAULT_ONBOARDING_ITEMS = 
  {
    title: "Connect with Friends and Family",
    description: "Connecting with family and friends provides a sense of belonging and security.",
    centerIcon: "👥",
    floatingIcons: ["👨", "👩", "🧑", "👴", "👵", "👶"],
    primaryButtonText: "Sign Up",
    showSkipButton: true,
    footerText: "Already have an account? Sign in"
  }

  
  export  const countryCodes = [
      { code: '+91', country: 'IN', name: 'India' },
      { code: '+1', country: 'US', name: 'United States' },
      { code: '+44', country: 'GB', name: 'United Kingdom' },
      { code: '+971', country: 'AE', name: 'UAE' },
      { code: '+65', country: 'SG', name: 'Singapore' },
      { code: '+86', country: 'CN', name: 'China' },
      { code: '+81', country: 'JP', name: 'Japan' },
      { code: '+49', country: 'DE', name: 'Germany' },
      { code: '+33', country: 'FR', name: 'France' },
      { code: '+39', country: 'IT', name: 'Italy' },
      { code: '+34', country: 'ES', name: 'Spain' },
      { code: '+7', country: 'RU', name: 'Russia' },
      { code: '+82', country: 'KR', name: 'South Korea' },
      { code: '+55', country: 'BR', name: 'Brazil' },
      { code: '+52', country: 'MX', name: 'Mexico' },
      { code: '+61', country: 'AU', name: 'Australia' },
      { code: '+64', country: 'NZ', name: 'New Zealand' },
      { code: '+27', country: 'ZA', name: 'South Africa' },
      { code: '+20', country: 'EG', name: 'Egypt' },
      { code: '+234', country: 'NG', name: 'Nigeria' }
    ];