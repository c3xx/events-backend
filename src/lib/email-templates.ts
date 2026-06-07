export function getAccountCreatedContent(setPasswordUrl: string) {
	return `
Hello,

An account has been created for you.

To get started, please visit the link below to set your password:

${setPasswordUrl}

This is an automated message. Please do not reply.
`;
}

export function getPasswordSetupTokenContent(tokenUrl: string) {
	return `
Hello,

You requested a link to set up your account password.

Please click the link below to create your password. This link will expire in 15 minutes.

${tokenUrl}

If you did not request this, please ignore this email or contact your system administrator.

This is an automated message. Please do not reply.
`;
}

export function getResetPasswordContent(tokenUrl: string) {
	return `
Hello,

We received a request to reset the password for your account.

Please click the link below to set a new password. This link will expire in 15 minutes.

${tokenUrl}

If you did not request a password reset, you can safely ignore this email. Your password will not be changed.

This is an automated message. Please do not reply.
`;
}

export function getPasswordSetContent(loginUrl: string) {
	return `
Hello,

Your account password has been set successfully. Your account is now active.

You can log in using your credentials:

${loginUrl}

If you did not perform this action, please contact your system administrator immediately.

This is an automated security notification. Please do not reply.
`;
}

export function getPasswordChangedContent(loginUrl: string) {
	return `
Hello,

Your account password has been changed successfully.

You can log in using your updated credentials:

${loginUrl}

If you did not make this change, please contact your system administrator immediately.

This is an automated security notification. Please do not reply.
`;
}
