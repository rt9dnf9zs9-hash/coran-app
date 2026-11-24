import { Card } from '../components/ui';

// Modèles à compléter et à faire valider par un professionnel du droit avant publication.
export function LegalPage({ which }: { which: 'confidentialite' | 'conditions' }) {
  if (which === 'confidentialite') {
    return (
      <Card>
        <h1>Confidentialité</h1>
        <p className="small muted">Modèle à compléter (identité de l’éditeur, contact) et à faire valider avant publication.</p>
        <h2>Données collectées</h2>
        <ul>
          <li>Adresse e-mail et mot de passe (chiffré) : pour votre compte.</li>
          <li>Progression, résultats, révisions et temps d’étude : pour sauvegarder et synchroniser votre apprentissage.</li>
          <li>Statut d’abonnement : pour ouvrir les modules Premium. Les données bancaires sont traitées uniquement par Stripe, Apple ou Google.</li>
          <li>Tranche d’âge : pour respecter les règles applicables aux mineurs.</li>
        </ul>
        <h2>Ce que nous ne faisons pas</h2>
        <ul>
          <li>Aucune publicité, aucun traceur publicitaire, aucune revente de données.</li>
          <li>L’utilisation d’une application d’apprentissage du Coran peut être liée à des convictions : ces données sont traitées avec une protection renforcée et ne servent qu’au fonctionnement du service.</li>
        </ul>
        <h2>Hébergement et durée de conservation</h2>
        <p>Base de données hébergée dans l’Union européenne (Supabase). Données de compte conservées jusqu’à la suppression du compte ; journaux de paiement conservés 3 ans maximum pour les obligations comptables.</p>
        <h2>Vos droits</h2>
        <p>Accès et export (Profil → Télécharger mes données), rectification, suppression (Profil → Supprimer mon compte). Réclamation possible auprès de la CNIL.</p>
      </Card>
    );
  }
  return (
    <Card>
      <h1>Conditions d’utilisation</h1>
      <p className="small muted">Modèle à compléter et à faire valider avant publication.</p>
      <h2>Offre gratuite</h2>
      <p>Les modules 1 à 5 sont accessibles gratuitement et sans limite de durée.</p>
      <h2>Offre Premium</h2>
      <p>Abonnement annuel donnant accès aux modules 6 à 8. Prix affiché TTC avant paiement. Renouvellement automatique chaque année ; rappel par e-mail avant chaque échéance ; résiliation à tout moment, effective à la fin de la période payée.</p>
      <h2>Droit de rétractation</h2>
      <p>Pour un contenu numérique fourni immédiatement, le délai de rétractation de 14 jours ne s’applique plus une fois l’accès commencé, avec votre accord exprès donné lors du paiement.</p>
      <h2>Contenu coranique</h2>
      <p>Le texte coranique affiché provient du Tanzil Project (tanzil.net), licence Creative Commons Attribution 3.0, reproduit sans modification. Les traductions présentées sont indicatives ; les analyses grammaticales ne constituent pas une interprétation religieuse.</p>
    </Card>
  );
}
