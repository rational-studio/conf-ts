import { arrayMap } from '@conf-ts/macro';

const nums = [1, 2, 3];

export default {
  mapDouble: arrayMap(nums, x => (x > 1 ? x * 2 : x)),
  mapToString: arrayMap(nums, x => (x > 1 ? `${x}` : 'one')),
};
