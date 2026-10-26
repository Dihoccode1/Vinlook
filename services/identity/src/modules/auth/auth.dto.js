export function registrationDto(account) {
  return { accountId: String(account._id), status: 'pending' };
}

export function loginDto(account, accessToken) {
  return {
    accessToken,
    expiresIn: 7200,
    account: {
      id: String(account._id),
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      status: account.status,
    },
  };
}
