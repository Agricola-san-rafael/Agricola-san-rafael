export interface PageParams {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export function parsePageParams(searchParams: URLSearchParams): PageParams {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function paginatedResponse<T>(data: T[], total: number, { page, pageSize }: PageParams) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
