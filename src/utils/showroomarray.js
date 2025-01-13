
function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
      const val = item[key];
      if (seen.has(val)) {
          return false;
      }
      seen.add(val);
      return true;
  });
}

module.exports = {
  uniqueBy
};
