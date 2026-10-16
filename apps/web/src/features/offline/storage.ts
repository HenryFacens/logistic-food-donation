import type {
  OfflineDonationPublication,
  OfflineQueueStorage,
} from './types'

const DATABASE_NAME = 'resgata-offline'
const DATABASE_VERSION = 1
const STORE_NAME = 'donation-publications'

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), {
      once: true,
    })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('Falha ao acessar o IndexedDB.')),
      { once: true },
    )
  })

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener(
      'abort',
      () =>
        reject(
          transaction.error ??
            new Error('A transação da fila offline foi cancelada.'),
        ),
      { once: true },
    )
    transaction.addEventListener(
      'error',
      () =>
        reject(
          transaction.error ??
            new Error('A transação da fila offline falhou.'),
        ),
      { once: true },
    )
  })

export interface IndexedDbOfflineQueueStorageOptions {
  databaseName?: string
  indexedDb?: IDBFactory
}

export class IndexedDbOfflineQueueStorage implements OfflineQueueStorage {
  readonly #databaseName: string
  readonly #indexedDb?: IDBFactory
  #databasePromise: Promise<IDBDatabase> | null = null

  constructor({
    databaseName = DATABASE_NAME,
    indexedDb = globalThis.indexedDB,
  }: IndexedDbOfflineQueueStorageOptions = {}) {
    this.#databaseName = databaseName
    this.#indexedDb = indexedDb
  }

  async add(item: OfflineDonationPublication) {
    const database = await this.#database()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const request = transaction.objectStore(STORE_NAME).add(item)
    const added = await new Promise<boolean>((resolve, reject) => {
      request.addEventListener('success', () => resolve(true), { once: true })
      request.addEventListener(
        'error',
        (event) => {
          if (request.error?.name === 'ConstraintError') {
            event.preventDefault()
            event.stopPropagation()
            resolve(false)
            return
          }
          reject(
            request.error ??
              new Error('Não foi possível incluir a publicação offline.'),
          )
        },
        { once: true },
      )
    })
    await transactionDone(transaction)
    return added
  }

  async get(idempotencyKey: string) {
    const database = await this.#database()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const item = await requestResult<OfflineDonationPublication | undefined>(
      transaction.objectStore(STORE_NAME).get(idempotencyKey),
    )
    await transactionDone(transaction)
    return item
  }

  async list() {
    const database = await this.#database()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const items = await requestResult<OfflineDonationPublication[]>(
      transaction.objectStore(STORE_NAME).getAll(),
    )
    await transactionDone(transaction)
    return items
  }

  async put(item: OfflineDonationPublication) {
    const database = await this.#database()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(item)
    await transactionDone(transaction)
  }

  #database() {
    if (!this.#indexedDb) {
      return Promise.reject(
        new Error('IndexedDB não está disponível neste navegador.'),
      )
    }
    if (!this.#databasePromise) {
      const request = this.#indexedDb.open(
        this.#databaseName,
        DATABASE_VERSION,
      )
      this.#databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        request.addEventListener(
          'upgradeneeded',
          () => {
            const database = request.result
            if (!database.objectStoreNames.contains(STORE_NAME)) {
              database.createObjectStore(STORE_NAME, {
                keyPath: 'idempotencyKey',
              })
            }
          },
          { once: true },
        )
        request.addEventListener('success', () => resolve(request.result), {
          once: true,
        })
        request.addEventListener(
          'error',
          () => {
            this.#databasePromise = null
            reject(
              request.error ??
                new Error('Não foi possível abrir a fila offline.'),
            )
          },
          { once: true },
        )
        request.addEventListener(
          'blocked',
          () => {
            this.#databasePromise = null
            reject(
              new Error(
                'A atualização da fila offline está bloqueada por outra aba.',
              ),
            )
          },
          { once: true },
        )
      })
    }
    return this.#databasePromise
  }
}
