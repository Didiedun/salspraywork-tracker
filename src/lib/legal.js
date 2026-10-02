// Recorded acceptance of the Terms of Service and Privacy Notice (public.legal_acceptances).
// The database sets the user and the time; the app only says which version was accepted.
import { LEGAL_VERSION } from '../legal/business.js'

// true or false; null when it can't be checked (offline, or the table isn't there yet),
// in which case nobody should be nagged.
export async function hasAcceptedLegal(client, version = LEGAL_VERSION) {
  try {
    const { data, error } = await client.from('legal_acceptances').select('id').eq('version', version).limit(1)
    if (error || !Array.isArray(data)) return null
    return data.length > 0
  } catch {
    return null
  }
}

// Accepting the same version twice is fine (the row already exists).
export async function acceptLegal(client, version = LEGAL_VERSION) {
  const { error } = await client.from('legal_acceptances').insert({ version })
  if (error && error.code !== '23505') throw error
}
