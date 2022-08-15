export const omit = (propsToOmit: string[], target: { [key: string]: any }) =>
  Object.keys(target).reduce((acc, key) => {
    if (!propsToOmit.includes(key)) {
      acc[key] = target[key]
    }
    return acc
  }, {} as { [key: string]: any })
