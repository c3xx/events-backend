import * as repository from "./repository.js";

export async function getPermissions() {
	return await repository.getPermissions();
}
