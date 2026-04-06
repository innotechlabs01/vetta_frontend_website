"use client";

import React, { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

interface UserContextProps {
  user: User | null;
}

const UserContext = createContext<UserContextProps>({
  user: null,
});

export const UserProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: UserContextProps;
}) => {
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
