export const successResponse = <T>(data: T, message?: string) => {
  if (message === undefined) {
    return { success: true as const, data };
  }

  return { success: true as const, message, data };
};

export const errorResponse = (message: string) => {
  return { success: false as const, message };
};
