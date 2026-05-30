function ErrorAlert({ message }) {
    if (!message) {
        return null;
    }

    return (
        <div className="alert alert-danger neo-alert mt-3 text-center" role="alert" aria-live="assertive">
            {message}
        </div>
    );
}

export default ErrorAlert;
