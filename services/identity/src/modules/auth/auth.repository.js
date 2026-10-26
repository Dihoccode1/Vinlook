export function createAuthRepository(models) {
  return {
    createPendingAccount({ fullName, email, passwordHash }) {
      return models.StaffAccount.create({
        fullName,
        email,
        passwordHash,
        role: 'Staff',
        status: 'pending',
        authVersion: 0,
      });
    },
    findAccountForLogin(email) {
      return models.StaffAccount.findOne({ email }).select('+passwordHash');
    },
  };
}
