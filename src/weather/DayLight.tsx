import { createContext, useContext, useMemo } from "react";
import { Color } from "three";
import { WEATHER, signLightOf, type Weather, type WeatherLook } from "./overcast";

const DayLightContext = createContext<WeatherLook>(WEATHER.sunny);

export const DayLight: React.FC<{
  readonly weather?: Weather;
  readonly look?: WeatherLook;
  readonly children: React.ReactNode;
}> = ({ weather = "sunny", look, children }) => (
  <DayLightContext.Provider value={look ?? WEATHER[weather]}>{children}</DayLightContext.Provider>
);

export const useSignColor = () => {
  const look = useContext(DayLightContext);
  return useMemo(() => new Color().setScalar(signLightOf(look)), [look]);
};
