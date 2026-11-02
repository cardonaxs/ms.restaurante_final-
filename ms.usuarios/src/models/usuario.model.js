class Usuario {
  constructor(id, nombre, email, password, rol, created_at) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.password = password;
    this.rol = rol || 'cajero';
    this.created_at = created_at;
  }
}

module.exports = Usuario;