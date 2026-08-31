import Image from "next/image";
import logo from "@/assets/logo.jpeg";

type LogoMarkProps = {
  size?: number;
  priority?: boolean;
};

export function LogoMark({ size = 40, priority = false }: LogoMarkProps) {
  return (
    <Image
      src={logo}
      alt="Detechtico"
      width={size}
      height={size}
      className="shrink-0 rounded-md object-cover"
      priority={priority}
    />
  );
}
