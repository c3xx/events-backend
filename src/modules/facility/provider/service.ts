import type { FacilityScope } from "../scopes.js";
import * as repository from "./repository.js";
import type * as schemas from "./schema.js";

export async function addFacilityProvider(
	facility: FacilityScope["facility"],
	input: schemas.AddFacilityProviderSchema,
) {
	const existingProvider = facility.providers.find(
		(provider) =>
			provider.scope.type === input.providerType && provider.scope.id === input.providerId,
	);
	if (existingProvider != null)
		throw new Error(`The ${existingProvider.scope.type} is already a provider of the facility`);

	return await repository.addFacilityProvider(facility.id, {
		providerEntityType: input.providerType,
		providerEntityId: input.providerId,
	});
}

export async function removeFacilityProvider(
	facility: FacilityScope["facility"],
	providerId: number,
) {
	const existingProvider = facility.providers.find((provider) => provider.id === providerId);
	if (existingProvider == null)
		throw new Error(`Specified provider is not a provider of the facility`);

	return await repository.removeFacilityProvider(facility.id, {
		providerId: providerId,
		markAsUnavailable: facility.providers.length === 1,
	});
}
