/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
        unoptimized: true,
    },
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }    
};

export default nextConfig;
