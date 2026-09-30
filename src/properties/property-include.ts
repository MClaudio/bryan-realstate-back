/** Relations loaded with a property across the properties module. */
export const propertyInclude = {
  city: {
    select: {
      id: true,
      name: true,
    },
  },
  advisor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  negotiationClient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
  files: {
    orderBy: [
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
    include: {
      file: true,
    },
  },
};
