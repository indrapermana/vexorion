const esES = {
  common: {
    cancel: 'Cancelar',
    save: 'Guardar',
    saving: 'Guardando...',
    loading: 'Cargando...',
  },
  routeGuards: {
    checkingSession: 'Verificando sesión...',
    loadingWorkspace: 'Cargando espacio...',
  },
  login: {
    title: 'Inicio de sesión de administrador',
    description: 'Inicia sesión para gestionar inquilinos y la configuración del sistema.',
    tenantCode: 'Código de inquilino',
    emailOrUsername: 'Correo electrónico o nombre de usuario',
    password: 'Contraseña',
    signingIn: 'Iniciando sesión...',
    signInButton: 'Iniciar sesión',
  },
  pages: {
    tenantManagement: {
      loadingTools: 'Cargando herramientas de inquilinos...',
      description: 'Gestiona todos los inquilinos registrados en el sistema. Solo visible para administradores del sistema.',
      metrics: {
        rows: 'Total de inquilinos',
        active: 'Inquilinos activos',
      },
    },
  },
  components: {
    tenants: {
      grid: {
        codePrefix: 'Código:',
        noDomain: 'Sin dominio',
        active: 'Activo',
        inactive: 'Inactivo',
        columns: {
          tenant: 'Inquilino',
          domain: 'Dominio',
          createdAt: 'Creado',
          status: 'Estado',
          actions: 'Acciones',
        },
      },
      editor: {
        editTitle: 'Editar Inquilino',
        loading: 'Cargando detalles del inquilino...',
        nameLabel: 'Nombre del inquilino',
        codeLabel: 'Código del inquilino',
        codeHelperText: 'El código no se puede cambiar después de la creación.',
        domainLabel: 'Dominio',
        activeLabel: 'Activo',
        errors: {
          save: 'No se puede guardar el inquilino en este momento.',
        },
      },
    },
  },
}

export default esES
