<?php

declare(strict_types=1);

return [
    'default_visibility' => 'public',

    'prefixes' => [
        'qr' => 'q',
        'directory' => 'resources',
        'admin' => 'administrators/online-resources',
        'faculty_class' => 'faculty/classes/{class}/resources',
        'student' => 'student/resources',
    ],

    'middleware' => [
        'admin' => ['auth', 'administrators.only'],
        'faculty' => ['auth', 'faculty.verified', 'faculty.only', 'ensure.feature'],
        'student' => ['auth', 'student.only', 'ensure.feature'],
    ],
];
