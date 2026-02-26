import Image from "next/image";

export default function Logo({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center w-full h-full overflow-hidden rounded-xl ${className || ""}`}>
            <Image
                src="/Logo-subtitle.png"
                alt="SubStudio Logo"
                fill
                className="object-contain"
                priority
            />
        </div>
    );
}
