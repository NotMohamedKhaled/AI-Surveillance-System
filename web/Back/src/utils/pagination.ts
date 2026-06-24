export interface IPaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}


export const getPagination = (query: any) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};
