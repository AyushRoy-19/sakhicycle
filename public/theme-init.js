;(function () {
  function read(nextKey, legacyKey) {
    try {
      var value = localStorage.getItem(nextKey)
      if (value === null) {
        var legacy = localStorage.getItem(legacyKey)
        if (legacy !== null) {
          localStorage.setItem(nextKey, legacy)
          localStorage.removeItem(legacyKey)
          value = legacy
        }
      }
      return value
    } catch (error) {
      return null
    }
  }

  try {
    var stored = read('sakh-theme', 'ska-theme')
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-motion', read('sakh-motion', 'ska-motion') === 'off' ? 'off' : 'on')
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.setAttribute('data-motion', 'on')
  }
})()
