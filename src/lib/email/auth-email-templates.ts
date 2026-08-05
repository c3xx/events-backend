export function getAccountCreatedContent(setPasswordUrl: string) {
	return `<p>Hello,</p>
<p>An account has been created for you.</p>
<p>To activate your account and set your password, please visit the link below:</p>
<p>${setPasswordUrl}</p>
<p>If you did not expect this email, you may safely ignore it.</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

export function getPasswordSetupTokenContent(tokenUrl: string) {
	return `
<p>Hello,</p>
<p>You requested a link to set your account password.</p>
<p>Please use the link below to continue. This link will expire in 15 minutes.</p>
<p>${tokenUrl}</p>
<p>If you did not request this, please ignore this email or contact your system administrator.</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

export function getResetPasswordContent(tokenUrl: string) {
	return `
<p>Hello,</p>
<p>We received a request to reset the password for your account.</p>
<p>Please use the link below to set a new password. This link will expire in 15 minutes.</p>
<p>${tokenUrl}</p>
<p>If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
<p>This is an automated message. Please do not reply.</p>
`;
}

export function getPasswordSetContent(loginUrl: string) {
	return `
<p>Hello,</p>
<p>Your account password has been set successfully. Your account is now active.</p>
<p>You can log in using the following URL:</p>
<p>${loginUrl}</p>
<p>If you did not perform this action, please contact your system administrator immediately.</p>
<p>This is an automated security notification. Please do not reply.</p>
`;
}

export function getPasswordChangedContent(loginUrl: string) {
	return `
<p>Hello,</p>
<p>Your account password has been changed successfully.</p>
<p>You can log in using your updated credentials:</p>
<p>${loginUrl}</p>
<p>If you did not make this change, please contact your system administrator immediately.</p>
<p>This is an automated security notification. Please do not reply.</p>
`;
}
