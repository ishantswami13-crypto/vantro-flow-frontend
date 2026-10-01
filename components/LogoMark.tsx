import StarlaneMark from "@/components/brand/StarlaneMark";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return <StarlaneMark size={size} className={className} title="Starlane" />;
}
