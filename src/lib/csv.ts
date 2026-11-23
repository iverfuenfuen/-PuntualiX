/**
 * Descarga una tabla como archivo CSV que Excel abre correctamente en español:
 * separador ";" (la coma es el separador decimal en Colombia) y BOM UTF-8 para las tildes.
 */
export function descargarCSV(nombreArchivo: string, encabezados: string[], filas: Array<Array<string | number | null | undefined>>) {
  const celda = (v: string | number | null | undefined) => {
    const texto = v == null ? '' : String(v)
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const contenido = [encabezados, ...filas].map((fila) => fila.map(celda).join(';')).join('\r\n')
  const blob = new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
