import 'fake-indexeddb/auto'

// jsdom's URL.createObjectURL throws "not implemented" by default; the
// local backend only needs a value back, not a real blob: URL.
URL.createObjectURL = () => 'blob:mock-url'
URL.revokeObjectURL = () => {}
