<?php

declare(strict_types=1);

return [
    'default_visibility' => 'public',

    'media_disk' => env('ONLINE_RESOURCES_MEDIA_DISK'),

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
