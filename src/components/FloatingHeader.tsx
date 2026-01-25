import { getUserProfile } from '@/api/user';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthDialog } from '@/components/AuthDialog';

type floatingHeaderProps = {
    paragraph: string;
    heading: string;
    username: string;
    accountBadge: boolean;
    width?: string;
    showCreateButton?: boolean;
    onCreateClick?: () => void;
}
interface profileProps{
  fullName: string;
  profileImageUrl: string;
}

const FloatingHeader = ({paragraph, heading, username, accountBadge, width=""}: floatingHeaderProps) => {
  const router = useRouter();
  const [profile, setProfile] = useState<profileProps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUserStore();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useAuthGuard();



      useEffect(()=>{
        const initializeAuth = async () => {
          // Give a small delay to allow user store to initialize
          setTimeout(() => {
            setIsLoading(false);
          }, 300);

          if (user) {
            const fetchProfile = async () => {
              try{
                const data = await getUserProfile();
                //console.log(data)
                setProfile(data.userId)
              } catch(err){
                //console.log(err)
              }
            }
            fetchProfile();
          }
        };
        
        initializeAuth();
      },[user]);

  return (
          <>
          <div className={`bg-white p-6 rounded-xl shadow-sm flex justify-between items-center mb-6 ${width || 'min-w-6xl w-full'}`}>
            {/* Left Text */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{heading}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {paragraph}
              </p>
            </div>
    
            {/* Right Content */}
            <div className="flex items-center space-x-4">
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Create Post Button - only show when logged in */}
              {/* {!isLoading && showCreateButton && user && (
                <button 
                  onClick={onCreateClick}
                  className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create Post
                </button>
              )} */}
              
              {/* Login/Signup buttons for non-authenticated users */}
              {!isLoading && !user && (
                <div className="flex gap-2">
                  <Link 
                    href="/signin" 
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/signup" 
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-orange-600 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
              
              {/* Profile Info - only show when logged in */}
              {!isLoading && user && (
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col items-end">
                    <Link href={'/profile'}>
                      <span className="font-medium text-gray-900 hover:text-yellow-600 transition-colors cursor-pointer">
                        {profile?.fullName}
                      </span>
                    </Link>
                    {accountBadge && (
                      <span className="text-gray-400 text-xs">
                        {"Business Account"}
                      </span>
                    )}
                  </div>
                   <div
                     onClick={() => requireAuth(() => router.push('/profile'))}
                     className="cursor-pointer"
                   >
                  {profile?.profileImageUrl ? (
                    <Image
                      src={profile?.profileImageUrl}
                      alt={username}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center hover:bg-yellow-600 transition-colors">
                      <span className="text-white font-bold">
                        {profile?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                   </div>
                </div>
              )}
            </div>
    
          </div>
          
          {/* Auth Dialog */}
          <AuthDialog isOpen={showAuthDialog} onClose={closeAuthDialog} />
          </>
  )
}

export default FloatingHeader
