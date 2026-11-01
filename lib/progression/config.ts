import data from '../../data/progression/nova-level-realms.v1.json' with { type: 'json' };

export const progressionConfig = data;
const {levels, realms} = data;
if (levels.length !== 200 || realms.length !== 42) throw new Error('Invalid progression config size');
let expectedLevel = 1;
for (const [index, realm] of realms.entries()) {
  if (realm.sort_order !== index + 1 || realm.level_from !== expectedLevel || realm.level_to < realm.level_from) throw new Error('Invalid realm range');
  expectedLevel = realm.level_to + 1;
}
if (expectedLevel !== 201 || new Set(realms.map(realm => realm.realm_key)).size !== 42) throw new Error('Invalid realms');
for (const [index, entry] of levels.entries()) {
  const realm = realms.find(realm => realm.realm_key === entry.realm_key);
  const next = levels[index + 1];
  if (entry.level !== index + 1 || !Number.isSafeInteger(entry.cumulative_exp) || entry.cumulative_exp < 0 ||
    (index === 0 && entry.cumulative_exp !== 0) ||
    (next ? next.cumulative_exp <= entry.cumulative_exp || next.cumulative_exp - entry.cumulative_exp !== entry.exp_to_next_level : entry.exp_to_next_level !== 0) ||
    !realm || entry.level < realm.level_from || entry.level > realm.level_to || entry.realm_phase !== realm.realm_phase ||
    (realm.stage_scheme === 'none' ? entry.stage_index !== null : entry.stage_index !== entry.level - realm.level_from + 1 || entry.stage_count !== realm.level_to - realm.level_from + 1)) {
    throw new Error(`Invalid progression level ${entry.level}`);
  }
}
