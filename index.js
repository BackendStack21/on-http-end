module.exports = (res, cb) => {
  const parent = {
    write: res.write,
    end: res.end,
    content: undefined,
    ended: false
  }

  res.write = function (content) {
    accumulate(parent, content)
    return parent.write.apply(res, arguments)
  }

  res.end = function (content, encoding) {
    if (!parent.ended) {
      parent.ended = true

      accumulate(parent, content)
      const headers = res.getHeaders()
      const payload = map(res.statusCode, headers, parent.content, encoding)

      setImmediate(() => {
        cb(payload)
      })
    }

    return parent.end.apply(res, arguments)
  }
}

function map (status, headers, data, encoding) {
  return {
    status,
    headers,
    data,
    encoding: typeof encoding === 'string' ? encoding : null
  }
}

function accumulate (parent, content) {
  if (content) {
    if (typeof content === 'string') {
      parent.content = (parent.content || '') + content
    } else if (Buffer.isBuffer(content)) {
      let oldContent = parent.content

      if (typeof oldContent === 'string') {
        oldContent = Buffer.from(oldContent)
      } else if (!oldContent) {
        oldContent = Buffer.alloc(0)
      }

      parent.content = Buffer.concat([oldContent, content], oldContent.length + content.length)
    } else {
      parent.content = content
    }
  }
}
