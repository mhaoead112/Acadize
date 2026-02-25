import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface TenantInfo {
    id: string;
    name: string;
    subdomain: string;
    logoUrl?: string;
    primaryColor?: string;
    userSubscriptionEnabled: boolean;
    userMonthlyPricePiasters?: number;
    userAnnualPricePiasters?: number;
    userCurrency: string;
}

const fetchTenantInfo = async (): Promise<TenantInfo | null> => {
    try {
        const response = await axios.get('/api/tenant/info');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
};

export function useTenant() {
    return useQuery({
        queryKey: ['tenant-info'],
        queryFn: fetchTenantInfo,
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: false,
    });
}
