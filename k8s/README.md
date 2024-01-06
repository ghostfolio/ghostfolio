# Ghostfolio on Kubernetes with Helm - Developer's Quick Start Guide

Welcome to the Ghostfolio Kubernetes deployment using Helm! This guide is designed to assist developers with limited Kubernetes (k8s) experience in effortlessly setting up Ghostfolio on any k8s platform.

## Prerequisites

Make sure you have the following dependencies installed:

- [Kubernetes](https://kubernetes.io/)
- [Helm](https://helm.sh/)

## Configuration

1. Adjust Dependencies:

   Edit the `Charts.yaml` file to customize dependencies.

2. Additional Configuration:

   Modify the `values.yaml` file to include extra configurations, like `API_KEY_COINGECKO_DEMO` or `API_KEY_COINGECKO_PRO`.

## Deployment Steps

1. Create a New Namespace:

   Run the following command to create a dedicated namespace for Ghostfolio:

   ```bash
   kubectl create namespace ghostfolio
   ```

2. Update Helm Dependencies:

   Keep your Helm dependencies up to date by running:

   ```bash
   helm dependency update
   ```

3. Deploy Ghostfolio with Helm:

   Execute the Helm installation command:

   ```bash
   helm install ghostfolio . --namespace ghostfolio
   ```

4. Verify Service Readiness:

   Check if the deployment is ready and the service is running:

   ```bash
   kubectl get svc,deploy --namespace ghostfolio
   ```

5. Access Ghostfolio in your Browser:

   Open your browser and navigate to:

   ```plaintext
   localhost:32222
   ```

   If using Minikube, expose the service to localhost with:

   ```bash
   minikube service ghostfolio-ghostfolio -n ghostfolio 
   ```