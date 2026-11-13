import { useQuery } from '@tanstack/react-query';
import { PackageOpenIcon } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';

import { PageSizeSelect } from '@/components/page-size-select';
import { PaginationBar } from '@/components/pagination-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { FoodCard } from '@/features/foods/food-card';
import { listFoods } from '@/features/foods/foods-api';
import { parseProfileId } from '@/features/institutions/institution-kind';
import {
  getInstitution,
  institutionKey,
  isNotFound,
} from '@/features/institutions/institutions-api';
import {
  BackToList,
  ProfileError,
  ProfileHeader,
  ProfileSection,
  ProfileSkeleton,
} from '@/features/institutions/profile-parts';
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/lib/pagination';

export function EstablishmentProfilePage() {
  const id = parseProfileId(useParams().id);
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const pageSize = parsePageSize(searchParams.get('pageSize'));

  const profileQuery = useQuery({
    queryKey: institutionKey('establishment', id ?? 0),
    queryFn: () => getInstitution('establishment', id!),
    enabled: id !== null,
  });

  const foodsQuery = useQuery({
    queryKey: ['foods', { establishmentId: id, page, pageSize }],
    queryFn: () => listFoods({ establishmentId: id!, page, pageSize }),
    enabled: profileQuery.isSuccess,
  });

  function goToPage(nextPage: number) {
    setSearchParams((params) => {
      if (nextPage <= 1) params.delete('page');
      else params.set('page', String(nextPage));
      return params;
    });
  }

  function changePageSize(next: number) {
    setSearchParams((params) => {
      params.delete('page');
      if (next === DEFAULT_PAGE_SIZE) params.delete('pageSize');
      else params.set('pageSize', String(next));
      return params;
    });
  }

  if (id === null || profileQuery.isError) {
    return (
      <ProfileError
        kind="establishment"
        notFound={id === null || isNotFound(profileQuery.error)}
        onRetry={() => void profileQuery.refetch()}
      />
    );
  }

  if (!profileQuery.data) return <ProfileSkeleton />;

  const total = foodsQuery.data?.total ?? 0;
  const totalPages = foodsQuery.data ? Math.max(1, Math.ceil(total / foodsQuery.data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <BackToList kind="establishment" />
      <ProfileHeader institution={profileQuery.data} />

      <ProfileSection
        title="Alimentos disponíveis"
        subtitle={
          foodsQuery.data ? `${total} ${total === 1 ? 'alimento' : 'alimentos'}` : undefined
        }
      >
        {foodsQuery.isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        )}

        {foodsQuery.isError && (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Não foi possível carregar os alimentos. Tente novamente mais tarde.
          </p>
        )}

        {foodsQuery.data && foodsQuery.data.data.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <PackageOpenIcon className="text-muted-foreground size-10" />
            <p className="text-foreground font-medium">Nenhum alimento disponível no momento</p>
          </div>
        )}

        {foodsQuery.data && foodsQuery.data.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {foodsQuery.data.data.map((food) => (
                <FoodCard key={food.id} food={food} showEstablishment={false} />
              ))}
            </div>
            <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between">
              <PageSizeSelect value={pageSize} onChange={changePageSize} />
              <PaginationBar
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
                className="mx-0 w-auto"
              />
            </div>
          </>
        )}
      </ProfileSection>
    </div>
  );
}
