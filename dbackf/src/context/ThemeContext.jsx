import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Obtener tema guardado o usar 'light' por defecto
    const savedTheme = localStorage.getItem('modernShop_theme');
    return savedTheme || 'light';
  });

  // Persistir tema en localStorage
  useEffect(() => {
    localStorage.setItem('modernShop_theme', theme);
    
    // Agregar/quitar clase al body para Bootstrap
    if (theme === 'dark') {
      document.body.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('bg-dark', 'text-light');
    } else {
      document.body.setAttribute('data-bs-theme', 'light');
      document.body.classList.remove('bg-dark', 'text-light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const getThemeClasses = (lightClass = '', darkClass = '') => {
    return theme === 'dark' ? darkClass : lightClass;
  };

  const getCardClasses = () => {
    return theme === 'dark' 
      ? 'card bg-dark border-secondary text-light'
      : 'card bg-white border-light';
  };

  const getBackgroundClasses = () => {
    return theme === 'dark' 
      ? 'bg-dark text-light'
      : 'bg-light text-dark';
  };

  const getBadgeClasses = (variant = 'primary') => {
    if (theme === 'dark') {
      switch(variant) {
        case 'success': return 'badge bg-success';
        case 'danger': return 'badge bg-danger';
        case 'warning': return 'badge bg-warning text-dark';
        case 'info': return 'badge bg-info';
        case 'secondary': return 'badge bg-secondary';
        default: return 'badge bg-primary';
      }
    }
    return `badge bg-${variant}`;
  };

  const getButtonClasses = (variant = 'primary') => {
    if (theme === 'dark') {
      switch(variant) {
        case 'outline-primary': return 'btn btn-outline-light';
        case 'outline-secondary': return 'btn btn-outline-secondary';
        default: return `btn btn-${variant}`;
      }
    }
    return `btn btn-${variant}`;
  };

  const value = {
    theme,
    toggleTheme,
    getThemeClasses,
    getCardClasses,
    getBackgroundClasses,
    getBadgeClasses,
    getButtonClasses,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
