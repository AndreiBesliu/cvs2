#!/usr/bin/env bash
# Pașii de cont ai owner-ului pentru publicarea din workflow (ADR 0044), pe UN proiect, în Cloud Shell
# (https://shell.cloud.google.com/, cu contul owner-ului). Nimic de aici nu rulează asistentul: cere drepturile de owner.
#
#   bash pregateste-proiect.sh cncvectorstudio-test test
#   bash pregateste-proiect.sh cncvectorstudio live --pitr
#
# Face, idempotent (ce există deja se sare):
#   1. WIF: pool-ul `github` și furnizorul `cvs2` (doar repo-ul AndreiBesliu/cvs2);
#   2. contul de publicare `publicare-cncvs2`, cu rolurile publicării, folosibil DOAR din mediul GitHub al instanței;
#   3. contul joburilor de backup `backup-cncvs2` (export + marcaje), cu drept pe bucket-ul backup-ului;
#   4. opțional (`--pitr`, pentru live): recuperarea la un moment dat (PITR) pe baza Firestore.
# La final tipărește valorile pentru variabilele mediului GitHub (`INSTANTA`, `WIF_PROVIDER`, `SA_PUBLICARE`) și linia
# `SA_BACKUP=` pentru `functions/.env.<proiect>`.
set -euo pipefail

P="${1:?proiectul (cncvectorstudio-test sau cncvectorstudio)}"
MEDIU="${2:?mediul GitHub (test sau live)}"
PITR="${3:-}"
REPO="AndreiBesliu/cvs2"
case "$P:$MEDIU" in
  cncvectorstudio-test:test) BUCKET="gs://cncvectorstudio-test-backup" ;;
  cncvectorstudio:live) BUCKET="gs://cncvectorstudio-backup" ;;
  *) echo "perechea proiect / mediu nu e cunoscută: $P / $MEDIU"; exit 2 ;;
esac

gcloud config set project "$P" >/dev/null
N=$(gcloud projects describe "$P" --format='value(projectNumber)')
echo "Proiectul $P (numărul $N), mediul GitHub $MEDIU."

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com \
  firebasehosting.googleapis.com cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com cloudscheduler.googleapis.com firebaserules.googleapis.com firestore.googleapis.com \
  firebaseappcheck.googleapis.com

# 1. WIF: tokenul GitHub (OIDC) se schimbă pe o identitate Google doar pentru repo-ul nostru.
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe cvs2 --location=global --workload-identity-pool=github >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools providers create-oidc cvs2 --location=global --workload-identity-pool=github \
       --display-name="cvs2" --issuer-uri="https://token.actions.githubusercontent.com" \
       --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.environment=assertion.environment" \
       --attribute-condition="assertion.repository=='$REPO'"

# 2. Contul de publicare: hosting, funcțiile (cu invocarea publică a callable-urilor: Cloud Run), regulile, indecșii,
#    joburile programate, amprenta (Firestore), citirea configurației web și a cheii App Check.
SA_PUB="publicare-cncvs2@$P.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$SA_PUB" >/dev/null 2>&1 \
  || gcloud iam service-accounts create publicare-cncvs2 --display-name="Publicarea cncvs2 (GitHub Actions, WIF)"
for R in roles/firebasehosting.admin roles/cloudfunctions.admin roles/run.admin roles/iam.serviceAccountUser \
         roles/firebaserules.admin roles/datastore.indexAdmin roles/datastore.user roles/cloudscheduler.admin \
         roles/artifactregistry.admin roles/cloudbuild.builds.editor roles/serviceusage.serviceUsageConsumer \
         roles/firebase.viewer roles/firebaseappcheck.viewer; do
  gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$SA_PUB" --role="$R" --condition=None >/dev/null
done
# Doar joburile din mediul GitHub al instanței pot lua identitatea (live: abia după aprobarea owner-ului).
gcloud iam service-accounts add-iam-policy-binding "$SA_PUB" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.environment/$MEDIU" >/dev/null

# 3. Contul joburilor de backup (ADR 0041 §1, ADR 0044): exportul, marcajele și erorile (Firestore), bucket-ul.
SA_BAK="backup-cncvs2@$P.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$SA_BAK" >/dev/null 2>&1 \
  || gcloud iam service-accounts create backup-cncvs2 --display-name="Backup-ul zilnic cncvs2 (joburile programate)"
for R in roles/datastore.importExportAdmin roles/datastore.user; do
  gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$SA_BAK" --role="$R" --condition=None >/dev/null
done
if gcloud storage buckets describe "$BUCKET" >/dev/null 2>&1; then
  gcloud storage buckets add-iam-policy-binding "$BUCKET" --member="serviceAccount:$SA_BAK" --role=roles/storage.objectAdmin >/dev/null
  gcloud storage buckets add-iam-policy-binding "$BUCKET" --member="serviceAccount:$SA_BAK" --role=roles/storage.legacyBucketReader >/dev/null
else
  echo "⚠ Bucket-ul $BUCKET nu există: backup-ul pe $P se pornește odată cu bucket-ul (ADR 0041)."
fi

# 4. PITR (live): recuperarea bazei la orice moment din ultimele 7 zile.
if [ "$PITR" = "--pitr" ]; then
  gcloud firestore databases update --database='(default)' --enable-pitr
fi

echo
echo "Gata pe $P. Variabilele mediului GitHub „$MEDIU” (Settings → Environments → $MEDIU → Environment variables):"
echo "  INSTANTA=$MEDIU"
echo "  WIF_PROVIDER=projects/$N/locations/global/workloadIdentityPools/github/providers/cvs2"
echo "  SA_PUBLICARE=$SA_PUB"
echo "Linia pentru functions/.env.$P (o adaugă asistentul, apoi republică funcțiile):"
echo "  SA_BACKUP=$SA_BAK"
