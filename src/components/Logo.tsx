export default function Logo({ className }: { className?: string }) {
    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <rect width="100" height="100" rx="20" fill="url(#paint0_linear)" />
            <path
                d="M35 30C35 27.2386 37.2386 25 40 25H60C62.7614 25 65 27.2386 65 30V40C65 42.7614 62.7614 45 60 45H45C42.2386 45 40 47.2386 40 50V55C40 57.7614 42.2386 60 45 60H60C62.7614 60 65 62.2386 65 65V70C65 72.7614 62.7614 75 60 75H40C37.2386 75 35 72.7614 35 70V60C35 57.2386 37.2386 55 40 55H55C57.7614 55 60 52.7614 60 50V45C60 42.2386 57.7614 40 55 40H40C37.2386 40 35 37.2386 35 35V30Z"
                fill="currentColor"
            />
            {/* Play symbol accent */}
            <path d="M70 45L80 50L70 55V45Z" fill="url(#paint1_linear)" />
            <defs>
                <linearGradient
                    id="paint0_linear"
                    x1="0"
                    y1="0"
                    x2="100"
                    y2="100"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient
                    id="paint1_linear"
                    x1="70"
                    y1="45"
                    x2="80"
                    y2="55"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#FACC15" />
                    <stop offset="1" stopColor="#F97316" />
                </linearGradient>
            </defs>
        </svg>
    );
}
