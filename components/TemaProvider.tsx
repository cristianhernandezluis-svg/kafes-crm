"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

type TemaCRM = "claro" | "oscuro";

type TemaContextType = {
  tema: TemaCRM;
  temaClaro: boolean;
  cambiarTema: () => void;
};

const TemaContext = createContext<TemaContextType | null>(null);

export function TemaProvider({
  children,
  temaInicial,
}: {
  children: ReactNode;
  temaInicial: TemaCRM;
}) {
  const [tema, setTema] = useState<TemaCRM>(temaInicial);

  const temaClaro = tema === "claro";

  function cambiarTema() {
    setTema((actual) => {
      const nuevo: TemaCRM =
        actual === "claro" ? "oscuro" : "claro";

      localStorage.setItem("tema-crm", nuevo);

      document.cookie =
        `tema-crm=${nuevo}; path=/; max-age=31536000; SameSite=Lax`;

      document.documentElement.dataset.tema = nuevo;

      return nuevo;
    });
  }

  return (
    <TemaContext.Provider
      value={{
        tema,
        temaClaro,
        cambiarTema,
      }}
    >
      {children}
    </TemaContext.Provider>
  );
}

export function useTemaCRM() {
  const contexto = useContext(TemaContext);

  if (!contexto) {
    throw new Error(
      "useTemaCRM debe utilizarse dentro de TemaProvider"
    );
  }

  return contexto;
}