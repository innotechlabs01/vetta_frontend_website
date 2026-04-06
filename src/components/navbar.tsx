"use client"
import { useEffect, useCallback, useRef, useState } from "react"
import Image from "next/image"
import { Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { createClient } from "../utils/supabase/client"
import { useUser } from '@/context/UserContext';
import { signOutAction } from "../app/actions";

// Define proper type for profile state
interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
}

const Navbar = () => {
  const { user } = useUser();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Profile data with proper typing
  const [profile, setProfile] = useState<ProfileData>({
    full_name: null,
    avatar_url: null
  });

  const getProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        return;
      }
      
      if (data) {
        setProfile({
          full_name: data.full_name,
          avatar_url: null
        });
        
        // If avatar_url is available, fetch the signed URL
        if (data.avatar_url) {
          const { data: signedData } = await supabase.storage
            .from("recompry-private")
            .createSignedUrl(data.avatar_url, 604800);
          
          if (signedData && signedData.signedUrl) {
            setProfile(prev => ({
              ...prev,
              avatar_url: signedData.signedUrl
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);
  
  const toggleDropdown = () => setOpen(!open);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load profile when component mounts or user changes
  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user, getProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Get initials from profile name or fallback to user metadata or default
  const getUserInitial = (): string => {
    if (profile.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    } else if (user?.user_metadata?.name) {
      return String(user.user_metadata.name).charAt(0).toUpperCase();
    }
    return "U";
  };

  const initials = getUserInitial();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-end py-3 px-6 ">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full bg-gray-100 hover:ring-2 hover:ring-gray-300"
        >
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt="avatar"
              width={35}
              height={35}
              className="rounded-full object-cover"
              unoptimized={true}
            />
          ) : (
            <span className="text-gray-700 font-semibold">{initials}</span>
          )}
        </button>

        {/* Dropdown */}
        <div
          className={`absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg transition-all origin-top-right ${
            open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
          }`}
        >
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              {profile.full_name || (user?.user_metadata?.name as string) || "Usuario"}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <hr />
          <ul className="py-2 text-sm text-gray-700">
            <li>
              <Link onClick={toggleDropdown} href="/settings/profile" className="flex items-center px-4 py-2 hover:bg-gray-100">
                <Settings className="w-4 h-4 mr-2" />
                Configuraciones
              </Link>
            </li>
            <li>
              <form action={signOutAction}>  
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </button>
              </form>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;