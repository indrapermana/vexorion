const idID = {
  common: {
    cancel: 'Batal',
    save: 'Simpan',
    saving: 'Menyimpan...',
    loading: 'Memuat...',
  },
  routeGuards: {
    checkingSession: 'Memeriksa sesi...',
    loadingWorkspace: 'Memuat ruang kerja...',
  },
  login: {
    title: 'Masuk Admin',
    description: 'Masuk untuk mengelola tenant dan konfigurasi sistem.',
    tenantCode: 'Kode tenant',
    emailOrUsername: 'Email atau nama pengguna',
    password: 'Kata sandi',
    signingIn: 'Masuk...',
    signInButton: 'Masuk',
    systemAdminOnly: 'Hanya SystemAdmin',
    helpHint: 'Gunakan kode tenant demo dengan kredensial SystemAdmin Anda di lingkungan development.',
  },
  pages: {
    tenantManagement: {
      loadingTools: 'Memuat alat tenant...',
      description: 'Kelola semua tenant yang terdaftar dalam sistem. Hanya terlihat oleh administrator sistem.',
      metrics: {
        rows: 'Total tenant',
        active: 'Tenant aktif',
      },
    },
  },
  components: {
    tenants: {
      grid: {
        codePrefix: 'Kode:',
        noDomain: 'Tanpa domain',
        active: 'Aktif',
        inactive: 'Tidak aktif',
        columns: {
          tenant: 'Tenant',
          domain: 'Domain',
          createdAt: 'Dibuat',
          status: 'Status',
          actions: 'Tindakan',
        },
      },
      editor: {
        editTitle: 'Edit Tenant',
        loading: 'Memuat detail tenant...',
        nameLabel: 'Nama tenant',
        codeLabel: 'Kode tenant',
        codeHelperText: 'Kode tidak dapat diubah setelah dibuat.',
        domainLabel: 'Domain',
        activeLabel: 'Aktif',
        errors: {
          save: 'Tidak dapat menyimpan tenant saat ini.',
        },
      },
    },
  },
}

export default idID
