// Connexion au serveur Supabase (compte, Face ID, synchro entre appareils).
// La clé est publique : la sécurité RLS de la base limite chacun à ses propres données.
// Laisser vide = mode local (données seulement sur l'appareil, sans compte).
window.ZAKAT_CONFIG = {
  supabaseUrl: "",
  supabaseKey: ""
};
