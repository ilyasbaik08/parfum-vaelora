// UserContext.jsx
import { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userName, setUserName] = useState(null);
  const [userRole, setUserRole] = useState(null);

  return (
    <UserContext.Provider value={{ 
      userName, 
      setUserName,
      userRole,
      setUserRole
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);